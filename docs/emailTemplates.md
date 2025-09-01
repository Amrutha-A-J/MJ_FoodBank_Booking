# Email Templates

This document catalogs Brevo email templates used by the backend and the parameters passed to each template.

## Password setup email

- **Template ID variable:** `PASSWORD_SETUP_TEMPLATE_ID` (exposed as `config.passwordSetupTemplateId`)
- **Used in:**
  - `MJ_FB_Backend/src/controllers/authController.ts` (`requestPasswordReset`, `resendPasswordSetup`)
  - `MJ_FB_Backend/src/controllers/agencyController.ts` (`createAgency`)
  - `MJ_FB_Backend/src/controllers/admin/staffController.ts` (`createStaff`)
  - `MJ_FB_Backend/src/controllers/admin/adminStaffController.ts` (`createStaff`)
  - `MJ_FB_Backend/src/controllers/volunteer/volunteerController.ts` (`createVolunteer`, `createVolunteerShopperProfile`)
  - `MJ_FB_Backend/src/controllers/userController.ts` (`createUser`)
- **Params:**
  - `link` (string) – one-time URL to the `/set-password` page that lets the recipient create or reset their password.

