-- AlterTable
-- Reverts 20260813093346_faculty_biography: the reference site this codebase
-- was cloned from stores a faculty member's short biography as a
-- {label: "Short Biography", value} row inside the existing personalInfo
-- Json field, not a dedicated column. Data already migrated there before
-- this runs.
ALTER TABLE "faculty" DROP COLUMN "biography";
