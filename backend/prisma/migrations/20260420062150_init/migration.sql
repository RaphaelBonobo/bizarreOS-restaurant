-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'READONLY');

-- CreateEnum
CREATE TYPE "Unite" AS ENUM ('KG', 'G', 'L', 'CL', 'ML', 'PIECE', 'BOTTES', 'SACHET', 'BOUQUET');

-- CreateEnum
CREATE TYPE "Allergene" AS ENUM ('GLUTEN', 'CRUSTACES', 'OEUFS', 'POISSONS', 'ARACHIDES', 'SOJA', 'LAIT', 'FRUIT_A_COQUE', 'CELERI', 'MOUTARDE', 'SESAME', 'SULFITES', 'LUPIN', 'MOLLUSQUES');

-- CreateEnum
CREATE TYPE "TypeFournisseur" AS ENUM ('GROSSISTE_GENERALISTE', 'LEGUMES_FRUITS', 'BOUCHERIE_CHARCUTERIE', 'POISSONNERIE', 'CREMERIE', 'EPICERIE_SECHE', 'BOULANGERIE', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeNettoyage" AS ENUM ('NETTOYAGE_COMPLET', 'NETTOYAGE_SURFACE', 'DESINFECTION', 'NETTOYAGE_FRIGO', 'NETTOYAGE_FOUR', 'NETTOYAGE_PLAN_DE_TRAVAIL');

-- CreateEnum
CREATE TYPE "TypeRepas" AS ENUM ('DEJEUNER', 'DINER', 'BRUNCH', 'BUFFET', 'AUTRE');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nom" TEXT,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tenants" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT,

    CONSTRAINT "user_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fournisseurs" (
    "id" TEXT NOT NULL,
    "nom" TEXT,
    "nom_contact" TEXT,
    "adresse" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "type" "TypeFournisseur",
    "evaluation" INTEGER,
    "notes" TEXT,
    "bio" BOOLEAN NOT NULL DEFAULT false,
    "certificateur" TEXT,
    "numero_certificat" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "fournisseurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reception_factures" (
    "id" TEXT NOT NULL,
    "numero_piece" TEXT,
    "date_achat" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "reception_factures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "nom" TEXT,
    "origine" TEXT,
    "bio" BOOLEAN NOT NULL DEFAULT false,
    "prix_total" DECIMAL(15,2),
    "stock_reception" DECIMAL(15,3),
    "unite" "Unite",
    "allergenes" "Allergene"[],
    "evaluation_reception" INTEGER,
    "notes" TEXT,
    "epuise" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "lot_id" TEXT,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" TEXT NOT NULL,
    "nom" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type_repas" "TypeRepas",
    "description" TEXT,
    "nb_couverts" INTEGER NOT NULL,
    "nb_benevoles" INTEGER NOT NULL DEFAULT 0,
    "heures_benevoles" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "chiffre_affaires" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_ingredients" (
    "id" TEXT NOT NULL,
    "quantite" DECIMAL(10,3) NOT NULL,
    "unite" "Unite",
    "prix_unitaire" DECIMAL(10,4),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "menu_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "menu_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nettoyages" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type_nettoyage" "TypeNettoyage",
    "zone" TEXT,
    "conforme" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "prevu" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "utilisateur_id" TEXT,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "nettoyages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suivi_temperatures" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "equipement" TEXT NOT NULL,
    "temperature" DECIMAL(5,1) NOT NULL,
    "temperature_min" DECIMAL(5,1),
    "temperature_max" DECIMAL(5,1),
    "conformite" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "utilisateur_id" TEXT,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "suivi_temperatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configurations" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FournisseurToReceptionFacture" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_tenants_user_id_tenant_id_key" ON "user_tenants"("user_id", "tenant_id");

-- CreateIndex
CREATE INDEX "fournisseurs_tenant_id_idx" ON "fournisseurs"("tenant_id");

-- CreateIndex
CREATE INDEX "reception_factures_tenant_id_idx" ON "reception_factures"("tenant_id");

-- CreateIndex
CREATE INDEX "ingredients_tenant_id_idx" ON "ingredients"("tenant_id");

-- CreateIndex
CREATE INDEX "menus_tenant_id_idx" ON "menus"("tenant_id");

-- CreateIndex
CREATE INDEX "menus_date_idx" ON "menus"("date");

-- CreateIndex
CREATE INDEX "menu_ingredients_tenant_id_idx" ON "menu_ingredients"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_ingredients_menu_id_ingredient_id_key" ON "menu_ingredients"("menu_id", "ingredient_id");

-- CreateIndex
CREATE INDEX "nettoyages_tenant_id_idx" ON "nettoyages"("tenant_id");

-- CreateIndex
CREATE INDEX "nettoyages_date_idx" ON "nettoyages"("date");

-- CreateIndex
CREATE INDEX "suivi_temperatures_tenant_id_idx" ON "suivi_temperatures"("tenant_id");

-- CreateIndex
CREATE INDEX "suivi_temperatures_date_idx" ON "suivi_temperatures"("date");

-- CreateIndex
CREATE INDEX "configurations_tenant_id_category_idx" ON "configurations"("tenant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "configurations_tenant_id_category_key_key" ON "configurations"("tenant_id", "category", "key");

-- CreateIndex
CREATE UNIQUE INDEX "_FournisseurToReceptionFacture_AB_unique" ON "_FournisseurToReceptionFacture"("A", "B");

-- CreateIndex
CREATE INDEX "_FournisseurToReceptionFacture_B_index" ON "_FournisseurToReceptionFacture"("B");

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fournisseurs" ADD CONSTRAINT "fournisseurs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_factures" ADD CONSTRAINT "reception_factures_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "reception_factures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_ingredients" ADD CONSTRAINT "menu_ingredients_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_ingredients" ADD CONSTRAINT "menu_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_ingredients" ADD CONSTRAINT "menu_ingredients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nettoyages" ADD CONSTRAINT "nettoyages_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nettoyages" ADD CONSTRAINT "nettoyages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suivi_temperatures" ADD CONSTRAINT "suivi_temperatures_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suivi_temperatures" ADD CONSTRAINT "suivi_temperatures_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configurations" ADD CONSTRAINT "configurations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FournisseurToReceptionFacture" ADD CONSTRAINT "_FournisseurToReceptionFacture_A_fkey" FOREIGN KEY ("A") REFERENCES "fournisseurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FournisseurToReceptionFacture" ADD CONSTRAINT "_FournisseurToReceptionFacture_B_fkey" FOREIGN KEY ("B") REFERENCES "reception_factures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
