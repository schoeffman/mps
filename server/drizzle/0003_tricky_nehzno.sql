ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'New';
UPDATE "tasks" SET "status" = 'New' WHERE "status" = 'Backlog';
UPDATE "tasks" SET "status" = 'Next Up' WHERE "status" = 'Today';