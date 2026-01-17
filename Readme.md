# BIW - Team Setup Guide ( deleting this after all is updated)

## 🔑 API Keys Setup

### Firebase Config (SHARED - Same for Everyone)

**Ask the project leader (Suanloh) for the Firebase config**, then paste it into your `environment.ts`:

```typescript
firebase: {
  apiKey: ".. .",  // Shared - provided by project leader
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..."
}
```

### Gemini API Key (INDIVIDUAL - Each Person Gets Their Own)

**Each team member creates their own FREE Gemini API key:**

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Click **"Create API key in new project"**
5. Copy your key
6. Paste into `environment.ts`:

```typescript
geminiApiKey: "YOUR_OWN_GEMINI_KEY_HERE"  // Your personal key
```

**Why separate keys?**
- ✅ Free tier:  15 requests/minute per key
- ✅ No quota conflicts
- ✅ Everyone can work independently

---

## 🚀 Full Setup Steps

### 1. Clone the Repository
```bash
git clone https://github.com/Suanloh/kitahack2026.git
cd kitahack2026/BIW
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create Your Environment File
```bash
cp src/environments/environment.template.ts src/environments/environment.ts
```

### 4. Get API Keys

**A. Firebase Config** - Ask **Suanloh** for the Firebase config (everyone uses the same)

**B. Gemini API Key** - Create your own at https://aistudio.google.com/app/apikey

### 5. Update `src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  
  // FIREBASE - Shared by whole team (ask Suanloh for this)
  firebase: {
    apiKey: "AIza...",  // From project leader
    authDomain: "your-project.firebaseapp. com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId:  "1:123:web:abc",
    measurementId: "G-ABC123"
  },
  
  // GEMINI - Your personal key (create your own!)
  geminiApiKey: "AIza..."  // Your own key from aistudio.google.com
};
```

### 6. Run the App
```bash
ng serve
```

Open http://localhost:4200/

### 7. Verify Everything Works
- 🤖 **Test Gemini AI** → Should respond in 2-5 seconds
- 🔥 **Test Database** → Should show "Connected!"
- 📋 **List Available Models** → Shows your available models

---

## 🔐 Security Rules

### ✅ DO: 
- Share Firebase config with your team
- Create your own Gemini API key (free!)
- Keep `environment.ts` out of Git (it's in `.gitignore`)

### ❌ DON'T: 
- Commit `environment.ts` to GitHub
- Share your Gemini key publicly
- Share Gemini keys in team chat (each person creates their own)

---

## 💰 Cost Breakdown

| Service | Cost | Who Pays | Shared? |
|---------|------|----------|---------|
| **Firebase** (Firestore, Auth) | Free tier (generous) | Project budget | ✅ Yes - Everyone uses same project |
| **Gemini API** | Free:  15 req/min<br>Paid: $7/month | Each developer | ❌ No - Each person has own key |

---

## 🤝 Team Collaboration

### What's Shared: 
✅ Firebase project (same database)  
✅ Code repository  
✅ Firebase config  

### What's Individual: 
❌ Gemini API keys (each person creates their own)  
❌ `environment.ts` file (not in Git)  
❌ `node_modules` (installed locally)  

---

## 📞 Need Help?

- **Firebase access issues** → Ask Suanloh
- **Gemini API issues** → Check https://aistudio.google.com/app/apikey
- **Code issues** → Post in team chat
