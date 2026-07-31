ALTER TABLE `sources` ADD COLUMN `public_name` text;

UPDATE `sources` SET `public_name` = 'Khmer24' WHERE `slug` = 'khmer24-cambodia';
UPDATE `sources` SET `public_name` = 'Realestate.com.kh' WHERE `slug` = 'realestate-kh';
UPDATE `sources` SET `public_name` = 'FazWaz Cambodia' WHERE `slug` = 'fazwaz-kh';
UPDATE `sources` SET `public_name` = 'CAM Realty' WHERE `slug` = 'cam-realty-cambodia';
UPDATE `sources` SET `public_name` = 'Cambodia Property Asia' WHERE `slug` = 'cambodia-property-asia';
UPDATE `sources` SET `public_name` = 'IPS Cambodia' WHERE `slug` = 'ips-cambodia';
