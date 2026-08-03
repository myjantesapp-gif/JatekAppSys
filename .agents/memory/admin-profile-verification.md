---
name: Admin profile verification
description: Durable rule for verification and completion of restaurant and driver profiles created or managed by admins.
---

Admin-created restaurants and drivers may be made operationally verified and complete immediately so they can be managed from the dashboard. Legal identity fields must remain real user-supplied data; never use fabricated placeholders to satisfy onboarding fields.

**Why:** The admin workflow needs newly created records to be usable immediately, while fake ICE, national IDs, plates, or other legal values would corrupt business data and create compliance risk.

**How to apply:** Keep automatic operational flags for new admin records. Leave missing legal fields visible for later confirmation, and let admins explicitly validate or unvalidate legacy records from the dashboard.