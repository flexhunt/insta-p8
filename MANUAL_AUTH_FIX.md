# How to Fix "Invalid OAuth Token" for Discovery

The "Spy / Discovery" feature requires advanced permissions (`instagram_manage_insights`, `pages_show_list`) that the standard "Login with Instagram" button might not grant by default if the app is in Development mode or configured for Basic Display.

To fix this manually:

1.  **Go to Graph API Explorer**: [https://developers.facebook.com/tools/explorer/](https://developers.facebook.com/tools/explorer/)
2.  **Select App**: Ensure your "Instagram Login App" (or verified Business app) is selected in the top right.
3.  **Add Permissions**:
    Search for and add these permissions to the list:
    -   `instagram_basic`
    -   `instagram_manage_insights` (Crucial for Spy)
    -   `instagram_content_publish` (Crucial for Posting)
    -   `pages_show_list`
    -   `pages_read_engagement`
    -   `business_management`
4.  **Generate Token**: Click "Generate Access Token".
5.  **Copy Token**: Copy the long string.
6.  **Update Database**:
    -   Go to Supabase -> **Table Editor** -> `users`.
    -   Find your row.
    -   Paste the token into the `access_token` column.
    -   (Optional) Clear `business_account_id` if you want the app to re-discover it next time, but usually not needed.
7.  **Retry**: Go back to the app and try the **Spy** tab again.
