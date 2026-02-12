# 🔨 AI Carpentry Estimator

A **zero-auth, single-purpose tool** that automates carpentry project pricing using AI vision analysis. Upload architectural drawings (PDF/Images) and get instant, editable estimates.

## ✨ Features

- 🤖 **AI-Powered Analysis**: Uses Google Gemini 1.5 Flash to detect furniture & carpentry items from drawings
- 📄 **PDF Support**: Automatically converts PDF drawings to images for analysis
- ✏️ **Fully Editable**: All detected items, dimensions, and costs can be manually adjusted
- 💰 **Real-Time Calculations**: Instant updates as you change rates or quantities
- 📊 **Professional Quotes**: Export via print or copy-to-clipboard
- 🚫 **No Login Required**: Completely stateless - data stays in your browser
- ⚡ **Fast**: Built with Next.js 15 + React 19 + Zustand

## 🚀 Quick Start

### 1. Get Your Free Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your key

### 2. Configure Environment

Create a `.env.local` file in the project root:

\`\`\`bash
GEMINI_API_KEY=your_api_key_here
\`\`\`

### 3. Install & Run

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 How to Use

1. **Upload Drawing**: Drag & drop a PDF or image (PNG/JPG) of your floor plan
2. **AI Analysis**: Wait 5-10 seconds while Gemini identifies carpentry items
3. **Review & Edit**: Check detected items, adjust dimensions, labor hours, complexity
4. **Set Rates**: Configure your material rate ($/m²), labor rate ($/hour), and markup (%)
5. **Export Quote**: Print or copy the final estimate

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + Shadcn/UI
- **State**: Zustand
- **AI**: Google Gemini 1.5 Flash (Free tier)
- **PDF Processing**: PDF.js

## 📁 Project Structure

\`\`\`
/app
  /actions
    - analyze-drawing.ts    # Server action for AI analysis
  - page.tsx                # Main application page
  - layout.tsx              # Root layout
  - globals.css             # Global styles

/components
  /estimator
    - file-upload.tsx       # Drag & drop upload component
    - settings-panel.tsx    # Global pricing settings
    - data-table.tsx        # Editable items table
    - export-panel.tsx      # Export functionality
  /ui                       # Shadcn UI components

/lib
  - gemini.ts               # Gemini AI client & prompts

/store
  - useEstimateStore.ts     # Zustand state management
\`\`\`

## 🎯 Design Philosophy

This is a **Single Purpose Tool** - not a full CRM or project management system. It does ONE thing well:

- ✅ Input: Architectural drawing
- ✅ Process: AI detection + manual editing
- ✅ Output: Professional quote

**No feature creep. No user accounts. No database.**

## 🔧 Customization

### Adjust AI Prompt

Edit `lib/gemini.ts` to customize how the AI interprets drawings:

\`\`\`typescript
const prompt = \`You are an expert Quantity Surveyor...\`;
\`\`\`

### Change Default Rates

Edit `store/useEstimateStore.ts`:

\`\`\`typescript
globalSettings: {
  materialRate: 50,  // Change default material rate
  laborRate: 40,     // Change default labor rate
  markup: 20,        // Change default markup %
}
\`\`\`

## 📝 License

MIT - Use freely for commercial or personal projects.

## 🙏 Credits

- **AI**: Google Gemini
- **UI Components**: Shadcn/UI
- **Icons**: Lucide React
- **PDF Processing**: Mozilla PDF.js

---

**Built with ❤️ for carpenters who want to spend less time calculating and more time building.**
