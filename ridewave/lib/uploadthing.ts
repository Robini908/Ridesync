import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const f = createUploadthing();

// Helper to get tenant from user
async function getTenantFromUser() {
  const user = await currentUser();
  
  if (!user) {
    throw new UploadThingError("Unauthorized");
  }

  const dbUser = await prisma.user.findUnique({
    where: { externalId: user.id },
    include: { tenant: true }
  });

  if (!dbUser || !dbUser.tenant) {
    throw new UploadThingError("No tenant associated with user");
  }

  return { user: dbUser, tenant: dbUser.tenant };
}

// Our FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Tenant logo upload
  tenantLogo: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const { user, tenant } = await getTenantFromUser();
      
      // Check if user has permission to upload tenant assets
      if (!["TENANT_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
        throw new UploadThingError("Insufficient permissions");
      }

      return { 
        tenantId: tenant.id,
        userId: user.id,
        assetType: "logo"
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Save to database
      await prisma.brandingAsset.create({
        data: {
          tenantId: metadata.tenantId,
          type: metadata.assetType,
          name: file.name,
          url: file.url,
          fileSize: file.size,
          mimeType: file.type,
          isActive: true,
        },
      });

      // Update tenant logo field
      await prisma.tenant.update({
        where: { id: metadata.tenantId },
        data: { logo: file.url },
      });

      console.log("Logo upload complete for tenant:", metadata.tenantId);
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Tenant favicon upload
  tenantFavicon: f({ image: { maxFileSize: "1MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const { user, tenant } = await getTenantFromUser();
      
      if (!["TENANT_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
        throw new UploadThingError("Insufficient permissions");
      }

      return { 
        tenantId: tenant.id,
        userId: user.id,
        assetType: "favicon"
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await prisma.brandingAsset.create({
        data: {
          tenantId: metadata.tenantId,
          type: metadata.assetType,
          name: file.name,
          url: file.url,
          fileSize: file.size,
          mimeType: file.type,
          isActive: true,
        },
      });

      await prisma.tenant.update({
        where: { id: metadata.tenantId },
        data: { favicon: file.url },
      });

      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // General tenant branding assets
  tenantBrandingAssets: f({ 
    image: { maxFileSize: "8MB", maxFileCount: 5 }
  })
    .middleware(async ({ req }) => {
      const { user, tenant } = await getTenantFromUser();
      
      if (!["TENANT_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
        throw new UploadThingError("Insufficient permissions");
      }

      // Check subscription limits
      const hasCustomBranding = await prisma.tenantServiceAccess.findFirst({
        where: {
          tenantId: tenant.id,
          serviceType: "CUSTOM_BRANDING",
          isEnabled: true,
        },
      });

      if (!hasCustomBranding && tenant.subscriptionTier === "FREE") {
        throw new UploadThingError("Custom branding requires a paid subscription");
      }

      return { 
        tenantId: tenant.id,
        userId: user.id,
        assetType: "branding"
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await prisma.brandingAsset.create({
        data: {
          tenantId: metadata.tenantId,
          type: metadata.assetType,
          name: file.name,
          url: file.url,
          fileSize: file.size,
          mimeType: file.type,
          isActive: true,
        },
      });

      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Vehicle images upload
  vehicleImages: f({ 
    image: { maxFileSize: "4MB", maxFileCount: 10 }
  })
    .middleware(async ({ req }) => {
      const { user, tenant } = await getTenantFromUser();
      
      if (!["OPERATOR", "TENANT_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
        throw new UploadThingError("Insufficient permissions");
      }

      return { 
        tenantId: tenant.id,
        userId: user.id,
        assetType: "vehicle"
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Vehicle image upload complete:", file.url);
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Support ticket attachments
  supportAttachments: f({ 
    image: { maxFileSize: "4MB" },
    pdf: { maxFileSize: "8MB" }
  })
    .middleware(async ({ req }) => {
      const user = await currentUser();
      
      if (!user) {
        throw new UploadThingError("Unauthorized");
      }

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;