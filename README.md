# AeroShield 🛡️
### Physics-Informed Pollution Early Warning System

AeroShield is an environmental intelligence prototype designed to predict severe urban air-pollution episodes before they peak, using atmospheric physics (Planetary Boundary Layer height, thermal inversions, wind stagnation) combined with air-quality data.

---

## 🚀 Instant Deployment to Vercel

AeroShield is 100% frontend-ready (HTML5, CSS3, Vanilla JS) with zero build steps or database dependencies.

### Option 1: Deploy via Vercel Web Dashboard (Recommended)
1. Push this folder to a new **GitHub repository**.
2. Go to [vercel.com](https://vercel.com) and log in.
3. Click **"Add New..." → "Project"**.
4. Import your AeroShield GitHub repository.
5. Leave all build settings as default (**Framework Preset: Other**).
6. Click **"Deploy"**. Your live URL will be ready in under 10 seconds!

---

### Option 2: Deploy via Vercel CLI
Open your terminal in this directory and run:
```bash
# Run Vercel CLI (no global install required)
npx vercel
```
- When prompted, accept the default options by pressing `Enter`.
- To deploy directly to production:
```bash
npx vercel --prod
```

---

## 💻 Local Development
To run locally on your machine:
```bash
# Using Python
python -m http.server 8080

# Or using Node.js / npx
npx serve .
```
Open `http://localhost:8080` in any web browser.

---

## 📁 Project Structure
```text
AeroShield/
├── index.html        # Main dashboard structure (6 sections + modal)
├── style.css         # Custom cyber-environmental design system
├── script.js         # Interactive simulation engine, Leaflet heatmap & charts
├── vercel.json       # Vercel deployment configuration & security headers
├── package.json      # Project metadata & local dev scripts
├── .gitignore        # Git & Vercel ignore rules
└── README.md         # Deployment & documentation
```

---

## 🌟 Key Features
- **Early Warning Engine:** Episode probability, expected onset time, peak AQI estimate, and duration.
- **Pollution Trapping Index (PTI):** Conceptual index synthesizing PBL height, wind speed, inversions, and humidity.
- **Leaflet & Continuous AQI Heatmap:** Live geospatial map of Delhi-NCR with Inverse Distance Weighting (IDW) AQI heatmap interpolation and interactive monitoring stations.
- **Explainable AI (SHAP-style):** Transparent breakdown of atmospheric factors driving episode risk.
- **Interactive Scenarios:** Test Normal Day, Pollution Building, Severe Episode, and Recovery states with instant UI animation.
- **Dark / Light Theme:** Seamless contrast switching.
