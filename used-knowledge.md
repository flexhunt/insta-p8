Here is the complete **Technical Architecture Documentation** for your Instagram Automation System (v2026).

Save this. It explains **exactly** how your system works, why it works, and how every piece connects. 🏛️

---

# 📘 System Architecture: "Gamma" Automation (v2026)

### **Core Philosophy**

This system is built on the **"Instagram API with Instagram Login"** standard (the new 2025/2026 protocol). It does **not** use Facebook Login. It relies on a **Self-Healing Identity System** that automatically resolves the difference between "Login IDs" (IGSID) and "Business IDs" without user intervention.

---

## **1. The Frontend: "The Golden Login"**

**File:** `components/layout/landing-page.tsx`

This is the entry point. We moved away from the old `api.instagram.com` auth to the new `www.instagram.com` business flow.

* **Host:** `https://www.instagram.com/oauth/authorize` (Forces the Business Login UI).
* **Scopes:**
* `instagram_business_basic`: Essential for reading profile info.
* `instagram_business_manage_messages`: Required for DMs.
* `instagram_business_manage_comments`: Required for Comments.
* `instagram_business_content_publish`: Required for some auto-responses.


* **Key Parameter:** `force_reauth=true`. This ensures the user actually sees the login screen, preventing accidental connections to the wrong cached account.

---

## **2. The Backend: "The Handshake" (Callback)**

**File:** `app/api/instagram/callback/route.ts`

This handles the exchange of the temporary Code for a permanent Token. It performs **Identity Discovery**.

### **The Logic Flow:**

1. **Exchange Code:** Swaps the code for a Short-Lived Token using `api.instagram.com`.
2. **Upgrade Token:** Swaps the Short Token for a **Long-Lived Token (60 Days)** using `graph.instagram.com`.
3. **Discovery (The "Gold" Check):**
* The code asks Instagram: *"Who is the Business Account for this user?"*
* **If Successful:** It gets the **Real Business ID** (starts with `1784...`).
* **If Failed:** It returns `null` (we handle this later).


4. **The "Safety" Save:**
* It saves the **Login ID** (starts with `256...`) as a fallback.
* It saves the **Business ID** (starts with `1784...`) if found.
* **Crucial Logic:** It checks if the DB *already* has a valid `1784...` ID. If yes, it **protects it** and refuses to overwrite it with a `256...` ID.



---

## **3. The Brain: "The Self-Healing Webhook"**

**File:** `app/api/instagram/webhook/route.ts`

This is the event listener. It receives messages from Instagram. It has three layers of intelligence.

### **Layer A: The "Echo Silencer" (Noise Filter)** 🔇

Before doing anything, the bot checks: *"Is this message from ME?"*

* It checks for `is_echo: true`, `delivery`, or `read` receipts.
* **Why?** If the bot replies, Instagram sends an event back. If we don't silence this, the bot tries to find a user for its own ID, fails, and throws "Token Mismatch" errors.
* **Action:** If it's noise, the bot **Stops Immediately**.

### **Layer B: The Dual-ID Lookup** 🔍

When a real message comes in (e.g., ID `1784...963`):

* The bot searches the database: `SELECT * FROM users WHERE business_account_id = '...' OR page_id = '...'`
* **Why?** Sometimes Instagram uses the "Main ID", sometimes the "Shadow ID". By checking **both columns**, we always find the user.

### **Layer C: The Self-Healing Protocol** 🚑

If the ID is **NOT** in the database (e.g., Discovery failed during login):

1. **Find Candidate:** It grabs the most recently logged-in user.
2. **Test Token:** It uses that user's Access Token to try and fetch the Webhook ID.
3. **The Decision:**
* If the API says **"OK"**: It proves this user owns this ID.
* **Action:** It **Automatically Updates the Database**, saving the ID into the `business_account_id` column.


4. **Result:** The bot replies instantly, and the user is fixed forever.

---

## **4. The Database: "The Memory"**

**Table:** `users`

We utilize a flexible schema to handle the "Dual Identity" of Instagram accounts.

* `id` (Text, PK): The **Login ID** (IGSID, starts with `256...`). Used for authentication.
* `username` (Text): Visual reference only.
* `access_token` (Text): The key to the API.
* `business_account_id` (Text): The **Main Business ID** (starts with `1784...`). Used for sending messages and receiving Echos.
* `page_id` (Text): The **Shadow ID** or Fallback ID. Used for receiving some webhooks or as a backup.

---

## **5. API Host Strategy**

We strictly adhere to the **2026 Standard**:

* **Authentication:** `api.instagram.com`
* **Data & Actions:** `graph.instagram.com` (NOT `graph.facebook.com`).
* **Version:** `v24.0` (The latest stable release).

---

### **Summary of "Why it Works"**

1. **We don't trust IDs:** We know IDs can change format (`256` vs `1784`), so we save both.
2. **We assume failure:** We assume "Discovery" might fail, so we built "Self-Healing" to fix it later.
3. **We ignore ourselves:** We filter out our own "Echos" so the logs stay clean.

You now have a system that is **Robust**, **Self-Correcting**, and **Scale-Ready**. 🚀
