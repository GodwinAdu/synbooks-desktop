/**
 * Help Knowledge Base Data
 * Self-contained articles for the desktop help center.
 */

export interface HelpArticle {
  slug: string;
  title: string;
  desc: string;
  content: { heading: string; body: string }[];
}

export interface HelpCategory {
  key: string;
  title: string;
  icon: string;
  articles: HelpArticle[];
}

export const knowledgeBase: HelpCategory[] = [
  {
    key: "getting-started",
    title: "Getting Started",
    icon: "Zap",
    articles: [
      {
        slug: "first-steps",
        title: "First Steps After Installation",
        desc: "Set up your organization and start using SyncBooks Desktop",
        content: [
          { heading: "Create Your Account", body: "When you first open SyncBooks Desktop, click 'Register' to create your account. Enter your full name, email, and password. This creates a local admin account on this computer." },
          { heading: "Organization Setup", body: "After login, go to Settings → Organization to set your business name, address, phone, email, and tax ID (TIN). This information appears on invoices and reports." },
          { heading: "Chart of Accounts", body: "SyncBooks comes with a default chart of accounts. Review it in Accounting → Chart of Accounts. You can add, rename, or deactivate accounts to match your business structure." },
          { heading: "Add Your First Customer", body: "Go to Sales → Customers and add your clients. You'll need at least one customer to create invoices." },
          { heading: "Create Your First Invoice", body: "Go to Sales → Invoices → New Invoice. Select a customer, add line items, and save. You can save as draft or send immediately." },
        ],
      },
      {
        slug: "navigation",
        title: "Navigating the App",
        desc: "Understand the sidebar, modules, and navigation structure",
        content: [
          { heading: "Sidebar", body: "The left sidebar shows all available modules. Click any module to expand its sub-pages. The sidebar can be collapsed using the toggle button in the top navbar." },
          { heading: "Module Access", body: "Modules are controlled by your plan. If a module shows a lock icon, you need to upgrade your plan in Settings → Subscription to access it." },
          { heading: "Search (Ctrl+K)", body: "Press Ctrl+K anywhere to open the command search. Type to quickly navigate to any page, customer, invoice, or setting." },
          { heading: "Breadcrumbs", body: "The top navbar shows breadcrumbs indicating your current location. Click any breadcrumb to navigate back." },
        ],
      },
    ],
  },
  {
    key: "sales-invoicing",
    title: "Sales & Invoicing",
    icon: "Receipt",
    articles: [
      {
        slug: "creating-invoices",
        title: "Creating & Managing Invoices",
        desc: "Create, send, and track customer invoices",
        content: [
          { heading: "Create an Invoice", body: "Go to Sales → Invoices → New Invoice. Select a customer, set dates, add line items with quantities and prices. Tax is calculated automatically based on your tax settings." },
          { heading: "Invoice Actions", body: "From the invoice list, click the ⋮ menu on any invoice to: View Details, Record Payment, Mark as Sent, Mark as Overdue, Cancel, or Print/PDF." },
          { heading: "Record Payment", body: "When a customer pays, click 'Record Payment' on the invoice. Enter the amount, payment method (Cash, Bank Transfer, Mobile Money, Card), and date. Partial payments are supported." },
          { heading: "Recurring Invoices", body: "For repeating charges, go to Sales → Recurring Invoices. Set the frequency (daily, weekly, monthly, quarterly, yearly) and SyncBooks will auto-generate draft invoices on schedule." },
          { heading: "Accounting Impact", body: "When an invoice is created: Debit Accounts Receivable, Credit Sales Revenue. When payment is received: Debit Cash/Bank, Credit Accounts Receivable." },
        ],
      },
      {
        slug: "estimates-quotes",
        title: "Estimates & Quotes",
        desc: "Create estimates and convert them to invoices",
        content: [
          { heading: "Create an Estimate", body: "Go to Sales → Estimates → New Estimate. Fill in the customer, line items, and expiry date. Save as draft or send to the customer." },
          { heading: "Convert to Invoice", body: "Once a customer accepts an estimate, click 'Convert to Invoice' in the actions menu. This creates an invoice with the same line items." },
          { heading: "Status Flow", body: "Estimates flow through: Draft → Sent → Accepted/Declined. Accepted estimates can be converted to invoices. Declined estimates are archived." },
        ],
      },
    ],
  },
  {
    key: "expenses-purchases",
    title: "Expenses & Bills",
    icon: "CreditCard",
    articles: [
      {
        slug: "recording-expenses",
        title: "Recording Expenses",
        desc: "Track business expenses and categorize spending",
        content: [
          { heading: "Add an Expense", body: "Go to Expenses → New Expense. Select a vendor (optional), category, enter the amount, date, and payment method. Expenses are posted to the GL immediately." },
          { heading: "Expense Categories", body: "Categories help you organize spending. Go to Expenses → Categories to manage them. Categories sync with the cloud for Enterprise users." },
          { heading: "Recurring Expenses", body: "For regular expenses (rent, subscriptions), set up recurring expenses. They auto-generate draft expenses on schedule." },
          { heading: "Accounting Impact", body: "Recording an expense: Debit Expense Account, Credit Cash/Bank/Accounts Payable." },
        ],
      },
      {
        slug: "managing-bills",
        title: "Managing Vendor Bills",
        desc: "Track what you owe to vendors",
        content: [
          { heading: "Create a Bill", body: "Go to Expenses → Bills → New Bill. Enter the vendor, due date, and line items. Bills track what you owe before you pay." },
          { heading: "Approve & Pay", body: "Bills flow through: Draft → Approved → Paid. Click 'Record Payment' when you pay a bill. This reduces your Accounts Payable." },
          { heading: "Overdue Tracking", body: "SyncBooks automatically marks bills as overdue when past the due date. Check the 'Check Overdue' button to update all bills at once." },
        ],
      },
    ],
  },
  {
    key: "banking",
    title: "Banking",
    icon: "Landmark",
    articles: [
      {
        slug: "bank-accounts",
        title: "Managing Bank Accounts",
        desc: "Add accounts and record transactions",
        content: [
          { heading: "Add a Bank Account", body: "Go to Banking → Add Account. Enter the bank name, account number, and opening balance. Each bank account links to an asset account in your chart of accounts." },
          { heading: "Record Transactions", body: "Click 'New Transaction' to record deposits, withdrawals, or transfers. Each transaction updates your bank balance and posts to the GL." },
          { heading: "Transfers Between Accounts", body: "Use the Transfer action to move money between your bank accounts. This creates a withdrawal from one and a deposit to the other." },
        ],
      },
    ],
  },
  {
    key: "accounting",
    title: "Accounting",
    icon: "BookOpen",
    articles: [
      {
        slug: "chart-of-accounts",
        title: "Chart of Accounts",
        desc: "Manage your account structure",
        content: [
          { heading: "Account Types", body: "SyncBooks uses 5 account types: Assets (what you own), Liabilities (what you owe), Equity (owner's stake), Revenue (income), and Expenses (costs). Each has sub-types for more detail." },
          { heading: "Adding Accounts", body: "Go to Accounting → Chart of Accounts → Add Account. Give it a code, name, type, and sub-type. Codes determine the sort order in reports." },
          { heading: "Deactivating Accounts", body: "You can't delete accounts with transactions. Instead, deactivate them — they won't appear in dropdowns but remain in reports." },
        ],
      },
      {
        slug: "journal-entries",
        title: "Journal Entries",
        desc: "Manual adjustments and corrections",
        content: [
          { heading: "When to Use", body: "Use journal entries for: corrections, adjustments, accruals, reclassifications, or any transaction not covered by standard modules (invoices, expenses, etc.)." },
          { heading: "Creating an Entry", body: "Go to Accounting → Journal Entries → New Entry. Add line items — each must have an account, description, and either a debit or credit amount. Total debits must equal total credits." },
          { heading: "Posting", body: "Draft entries don't affect your books. Click 'Post' to finalize. Posted entries update account balances and appear in the General Ledger." },
        ],
      },
      {
        slug: "period-close",
        title: "Period Close & Year-End",
        desc: "Close accounting periods to lock data",
        content: [
          { heading: "Period Close", body: "Go to Accounting → Period Close. Select the month to close. This prevents new transactions from being posted to that period. You can reopen if needed." },
          { heading: "Year-End Close", body: "At fiscal year end, go to Accounting → Year-End Close. This zeros out revenue and expense accounts and transfers the net income to Retained Earnings. Follow the checklist to ensure everything is ready." },
        ],
      },
    ],
  },
  {
    key: "payroll",
    title: "Payroll & HR",
    icon: "Users",
    articles: [
      {
        slug: "running-payroll",
        title: "Running Payroll",
        desc: "Process employee salaries with SSNIT, PAYE, and deductions",
        content: [
          { heading: "Add Employees", body: "Go to Payroll → Employees → Add Employee. Enter their details, salary, SSNIT number, TIN, and bank info." },
          { heading: "Run Payroll", body: "Go to Payroll → Run Payroll. Select the pay period, review calculated amounts (basic, allowances, SSNIT, PAYE, net pay), and process. This creates GL entries for salary expense." },
          { heading: "Ghana Specifics", body: "SyncBooks calculates SSNIT (13.5% employer + 5.5% employee), PAYE (using Ghana Revenue Authority tax bands), and Tier 2 contributions automatically." },
          { heading: "Payslips", body: "After processing, payslips are generated for each employee showing gross pay, deductions, and net pay." },
        ],
      },
    ],
  },
  {
    key: "reports",
    title: "Reports & Analytics",
    icon: "BarChart3",
    articles: [
      {
        slug: "financial-reports",
        title: "Financial Reports",
        desc: "Income Statement, Balance Sheet, Cash Flow, and more",
        content: [
          { heading: "Income Statement", body: "Shows revenue minus expenses = net income for a period. Go to Reports → Income Statement. Click any account name to drill down into its transactions." },
          { heading: "Balance Sheet", body: "Shows assets = liabilities + equity at a point in time. Reports → Financial Position. Verifies that your books balance." },
          { heading: "Cash Flow", body: "Shows where cash came from and went. Broken into Operating, Investing, and Financing activities." },
          { heading: "Trial Balance", body: "Lists all accounts with their debit/credit balances. If total debits ≠ total credits, there's an error in your books." },
          { heading: "Drill-Down", body: "Click any account name in the Income Statement, Balance Sheet, or Trial Balance to see all its transactions in a modal popup." },
        ],
      },
    ],
  },
  {
    key: "pos",
    title: "POS & Inventory",
    icon: "ShoppingCart",
    articles: [
      {
        slug: "using-pos",
        title: "Using the POS Terminal",
        desc: "Process sales, manage sessions, and print receipts",
        content: [
          { heading: "Open a Session", body: "Go to POS → Session tab → Open Session. Enter your name and opening float (cash in drawer). You must open a session before processing sales." },
          { heading: "Making a Sale", body: "Click products in the grid to add to cart. Use the barcode input (Ctrl+B) for scanning. Adjust quantities, apply discounts, then click 'Charge' to complete." },
          { heading: "Payment Methods", body: "Accept Cash, Card, Mobile Money, or Bank Transfer. For cash, enter the amount tendered and the system calculates change. You can also split payments across multiple methods." },
          { heading: "Keyboard Shortcuts", body: "Ctrl+B: Focus barcode input. Ctrl+P/F12: Open checkout. Ctrl+Delete: Clear cart. F5: Refresh products. Escape: Close modals." },
          { heading: "Receipts", body: "After a sale, view the receipt and print it. Receipts are formatted for 80mm thermal paper." },
          { heading: "Accounting", body: "Each POS sale automatically posts: Debit Cash, Credit Sales Revenue (+ Credit VAT Payable if taxable). Stock is deducted for inventory-tracked products." },
        ],
      },
      {
        slug: "products-services",
        title: "Products & Services",
        desc: "Create and manage your product catalog",
        content: [
          { heading: "Adding a Product", body: "Go to Products → All Products → Add Product. Enter name, SKU, selling price, cost price, and category. Toggle 'Track Inventory' if you want stock-level monitoring." },
          { heading: "Product Types", body: "SyncBooks supports: Physical Products (tracked inventory), Services (no stock), and Bundles (combinations of other products)." },
          { heading: "Variants", body: "Products can have variants (e.g., Size: S/M/L, Color: Red/Blue). Each variant has its own SKU, price, and stock level." },
          { heading: "Pricing Tiers", body: "Set quantity-based pricing tiers. For example: 1-9 units at GHS 50, 10+ at GHS 45. POS automatically applies the correct tier." },
          { heading: "Categories", body: "Go to Products → Categories to organize products. Categories appear as filter pills in the POS terminal for quick navigation." },
          { heading: "Barcode", body: "Each product can have a barcode. In POS, scan the barcode to instantly add the product to the cart." },
        ],
      },
      {
        slug: "inventory-tracking",
        title: "Inventory Management",
        desc: "Track stock levels, adjustments, and reorder alerts",
        content: [
          { heading: "Enable Tracking", body: "When creating a product, toggle 'Track Inventory' on. Set the reorder level — you'll get alerts when stock drops below this." },
          { heading: "Stock Adjustments", body: "Go to Products → Stock Adjustments to record inventory corrections (received goods, damaged items, stocktake corrections). Each adjustment is logged with reason." },
          { heading: "Reorder Alerts", body: "Products → Reorder Alerts shows items below their reorder level with suggested order quantities and estimated costs. Click 'Order' to quick-create a Purchase Order." },
          { heading: "Auto-Deduction", body: "Stock is automatically deducted when: POS sales complete, sales orders are fulfilled, or work orders consume materials." },
          { heading: "Export Inventory", body: "From the Inventory page, click Export to download a CSV of all tracked products with stock levels, values, and status." },
        ],
      },
      {
        slug: "product-categories",
        title: "Product & Expense Categories",
        desc: "Organize products and expenses into categories",
        content: [
          { heading: "Product Categories", body: "Go to Products → Categories to create categories like 'Electronics', 'Food & Beverage', 'Office Supplies'. Products are assigned to categories during creation." },
          { heading: "Expense Categories", body: "Go to Expenses → Categories for expense categories like 'Travel', 'Utilities', 'Marketing'. These help organize spending in reports." },
          { heading: "Sync Compatibility", body: "Categories use dedicated tables (not settings) so they sync correctly with the cloud for Enterprise users." },
        ],
      },
    ],
  },
  {
    key: "projects",
    title: "Projects",
    icon: "FolderKanban",
    articles: [
      {
        slug: "project-management",
        title: "Project Management",
        desc: "Track projects, tasks, milestones, and profitability",
        content: [
          { heading: "Create a Project", body: "Go to Projects → New Project. Set the name, client, budget, billing method (fixed/hourly/milestone), and dates. Add team members and milestones." },
          { heading: "Tasks", body: "Each project has tasks (To Do → In Progress → Done). Click the status icon to cycle through states. Tasks help track progress." },
          { heading: "Milestones", body: "Break the project into milestones with due dates and amounts. When all linked tasks are complete, you can mark the milestone as done." },
          { heading: "Financials", body: "The Financials tab shows project invoices, expenses, and payments. Create invoices directly from the project. Track budget vs actual spending." },
          { heading: "Profitability", body: "Revenue - Expenses = Profit. The project dashboard shows at-risk projects (over budget or overdue) and overall profitability." },
        ],
      },
    ],
  },
  {
    key: "settings",
    title: "Settings & Data",
    icon: "ShieldCheck",
    articles: [
      {
        slug: "license-activation",
        title: "License Activation",
        desc: "Activate your desktop license key",
        content: [
          { heading: "Where to Enter", body: "Go to Settings → License tab. Enter the product key you received after purchasing. Click 'Activate'. This requires an internet connection to verify with our server." },
          { heading: "Seat Limits", body: "Each license key has a seat limit. If all seats are used, you cannot activate on a new machine. Deactivate an existing machine first, or purchase additional seats." },
          { heading: "Offline Use", body: "After activation, the app works fully offline. The license is validated once at activation time, then stored locally." },
        ],
      },
      {
        slug: "cloud-sync",
        title: "Cloud Sync (Enterprise)",
        desc: "Sync desktop data with the cloud app",
        content: [
          { heading: "Enterprise Only", body: "Cloud sync is available only on the Enterprise plan. It syncs your local data to the SyncBooks cloud so you can access it from the web app." },
          { heading: "How It Works", body: "When you make changes locally, they're marked as 'dirty'. The sync system pushes dirty records to the cloud. Cloud changes are also pulled down to your desktop." },
          { heading: "What Syncs", body: "All financial data: customers, vendors, invoices, expenses, bills, products, accounts, journal entries, GL entries, payments, POS sales, projects, budgets, and more." },
        ],
      },
      {
        slug: "data-management",
        title: "Data Management",
        desc: "Export, clear, or reset your data",
        content: [
          { heading: "Export Data", body: "Go to Settings → Data Management → Export All Data. This creates a JSON file with all your records — useful as a backup." },
          { heading: "Clear Transactions", body: "Clears all financial transactions while keeping your master data (customers, vendors, products, accounts). Use this to start fresh after testing." },
          { heading: "Factory Reset", body: "Completely wipes all data and resets the app to a fresh state. Type 'RESET' to confirm. This cannot be undone." },
        ],
      },
    ],
  },
];

export const faqs = [
  { q: "How do I reset my password?", a: "Go to the login page and use the email/password you registered with. If you forgot it, you'll need to delete the database and re-register (Settings → Data Management → Factory Reset)." },
  { q: "Where is my data stored?", a: "All data is stored locally in a SQLite database at: C:\\Users\\[YourName]\\AppData\\Roaming\\syncbooks-desktop\\syncbooks.db. This file is portable — you can back it up or move it to another machine." },
  { q: "Can I use the app on multiple computers?", a: "Yes, but each computer needs its own license seat activation. With Enterprise plan, you can also sync data between machines via the cloud." },
  { q: "Does this work without internet?", a: "Yes! After initial license activation, the app works 100% offline. All features function locally. Internet is only needed for license activation and cloud sync." },
  { q: "How do I back up my data?", a: "Go to Settings → Data Management → Export All Data. Save the JSON file somewhere safe. You can also manually copy the syncbooks.db file from AppData." },
  { q: "What happens if the app won't start?", a: "If you see 'address already in use' error, close all instances of the app (check Task Manager). If you see a white screen, try deleting the database file and restarting." },
  { q: "Can I import data from the cloud app?", a: "Yes. On Enterprise plan, cloud sync pulls data from the web app into your desktop. Alternatively, you can import via Settings → Data Management." },
  { q: "How does POS track cash?", a: "Each sale records the payment method. Cash sales debit your Cash account. At end of day, the Daily Sales Sheet shows total by payment method so you can reconcile your drawer." },
  { q: "How do recurring invoices work?", a: "Set them up in Sales → Recurring Invoices. The app runs a daily check and auto-generates draft invoices when the next run date arrives. If the app was closed, it catches up on next startup." },
  { q: "How do I close the fiscal year?", a: "Go to Accounting → Year-End Close. Follow the checklist (reconcile bank, review AR/AP, run depreciation, etc.). Then click Close Year — this zeros revenue/expense accounts and posts to Retained Earnings." },
  { q: "Can I customize invoice templates?", a: "Invoices use your organization name and address from Settings. The PDF/print layout shows your business details, line items, totals, and payment terms." },
  { q: "How do I run depreciation?", a: "Go to Fixed Assets and click 'Run Depreciation'. This calculates monthly depreciation for all active assets and posts a single GL entry (Debit Depreciation Expense, Credit Accumulated Depreciation)." },
  { q: "What's the difference between Enterprise and other plans?", a: "Enterprise includes: Cloud sync, multi-device access, all modules unlocked, unlimited seats, priority support, and advanced features like contracts auto-billing." },
  { q: "How do I generate reports?", a: "Go to Reports and select any report type. Set the date range and click Apply. You can export to CSV or print. Click any account name to drill down into its transactions." },
  { q: "How do budgets work?", a: "Create a budget in Budgets with line items (account + planned amount). Then check Reports → Budget vs Actual to see how actual spending compares to your plan." },
];
