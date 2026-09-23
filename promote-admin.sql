INSERT INTO "Role" (id, name)
VALUES (gen_random_uuid()::text, 'admin')
ON CONFLICT (name) DO NOTHING;

INSERT INTO "_UserRoles" ("A", "B")
SELECT r.id, 'ac697376-eb28-4284-b97f-b9a0459fc28c'
FROM "Role" r
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

SELECT u.email, r.name AS role
FROM "User" u
JOIN "_UserRoles" ur ON ur."B" = u.id
JOIN "Role" r ON r.id = ur."A"
WHERE u.id = 'ac697376-eb28-4284-b97f-b9a0459fc28c';


-- User	accounts — id, email, password, timestamps
-- Role	— role definitions (user, admin)
-- _UserRoles —	Prisma's implicit many-to-many join table between User and Role
-- _prisma_migrations —	Prisma's own bookkeeping of which migrations have run