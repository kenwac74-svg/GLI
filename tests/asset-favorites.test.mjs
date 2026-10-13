import test from "node:test";
import assert from "node:assert/strict";
import { migratedDatabase } from "./support/sqlite-d1.mjs";
import { createD1AssetReferenceRepository } from "../db/asset-reference-repository.ts";
import { createD1AssetFavoritesRepository } from "../db/asset-favorites-repository.ts";
import { ensureUser, addFavorite } from "../db/user-workflows.ts";
import { assets } from "../lib/assets.ts";

const sample={...assets[0],id:"favorite-external",sourceName:"Portal",sourceUrl:"https://example.com/1",isGliDirect:false,trustStatus:"PRELIMINARY"};
test("external favorites survive source removal, stay private, and un-favorite keeps data",async()=>{
  const {sqlite,database}=migratedDatabase();
  try {
    const u=await ensureUser(database,{email:"first@example.com"}),v=await ensureUser(database,{email:"other@example.com"});
    const refs=createD1AssetReferenceRepository(database),fav=createD1AssetFavoritesRepository(database);
    await refs.upsertSnapshot(sample,"2026-10-01T00:00:00Z","discovery");
    assert.equal((await fav.add(u.id,sample.id)).created,true);
    assert.equal((await fav.add(u.id,sample.id)).created,false);
    await refs.markStatus(sample.id,{sourceState:"removed",transactionState:"completed"},"2026-10-02T00:00:00Z");
    assert.equal((await fav.list(u.id))[0].asset.price,sample.price);
    assert.deepEqual(await fav.list(v.id),[]);
    assert.equal((await fav.remove(v.id,sample.id)).removed,false);
    assert.equal((await fav.remove(u.id,sample.id)).removed,true);
    assert.ok(await refs.get(sample.id));
    assert.ok(sqlite.prepare("SELECT id FROM asset_versions WHERE asset_public_id=?").get(sample.id));
  }finally{sqlite.close();}
});
test("legacy listing favorite is migrated without deletion even when archived",async()=>{
  const {sqlite,database}=migratedDatabase();
  try {
    const u=await ensureUser(database,{email:"legacy@example.com"});
    await addFavorite(database,{userId:u.id,listingPublicId:"GLI-KH-004"});
    sqlite.exec("UPDATE listings SET status='ARCHIVED' WHERE public_id='GLI-KH-004'");
    const repo=createD1AssetFavoritesRepository(database);
    assert.equal((await repo.list(u.id))[0].publicId,"GLI-KH-004");
    const outsider=await ensureUser(database,{email:"outsider@example.com"});
    await assert.rejects(repo.add(outsider.id,"GLI-KH-004"));
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM favorites").get().n,1);
    await repo.remove(u.id,"GLI-KH-004");
    assert.equal((await repo.list(u.id)).length,0);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM listings").get().n,8);
  }finally{sqlite.close();}
});
test("a delayed legacy migration cannot resurrect a removed favorite",async()=>{
  const {sqlite,database}=migratedDatabase();
  let resume,paused;
  const gate=new Promise(resolve=>{resume=resolve;}),ready=new Promise(resolve=>{paused=resolve;});
  try{
    const u=await ensureUser(database,{email:"race@example.com"});
    await addFavorite(database,{userId:u.id,listingPublicId:"GLI-KH-004"});
    let held=false;
    const delayed={...database,prepare(sql){
      const statement=database.prepare(sql);
      if(!sql.includes("INSERT OR IGNORE INTO asset_favorite_refs"))return statement;
      const wrapper={...statement,bind(...args){statement.bind(...args);return wrapper;},async run(){
        if(!held){held=true;paused();await gate;}
        return statement.run();
      }};return wrapper;
    }};
    const listing=createD1AssetFavoritesRepository(delayed).list(u.id);
    await ready;
    await createD1AssetFavoritesRepository(database).remove(u.id,"GLI-KH-004");
    resume();
    assert.deepEqual(await listing,[]);
  }finally{resume();sqlite.close();}
});
