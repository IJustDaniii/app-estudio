CREATE UNIQUE INDEX "UserPet_one_active_per_user_key"
ON "UserPet" ("userId")
WHERE "isActive" = true;

ALTER TABLE "EggRarityProbability"
ADD CONSTRAINT "EggRarityProbability_weight_range"
CHECK ("weight" >= 0 AND "weight" <= 10000);

ALTER TABLE "UserPet"
ADD CONSTRAINT "UserPet_happiness_range"
CHECK ("happiness" >= 0 AND "happiness" <= 100);

ALTER TABLE "UserPet"
ADD CONSTRAINT "UserPet_progress_non_negative"
CHECK ("level" >= 1 AND "xp" >= 0);

ALTER TABLE "UserEgg"
ADD CONSTRAINT "UserEgg_incubation_non_negative"
CHECK ("incubationXp" >= 0 AND "incubationRequiredXp" > 0);
