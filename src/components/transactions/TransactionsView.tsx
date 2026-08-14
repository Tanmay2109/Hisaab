import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Download,
  Upload,
  Filter,
  Trash2,
  Receipt,
  Sparkles,
  Camera,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Account, Transaction, TransactionType } from "../../types";
import {
  DEFAULT_CATEGORIES,
  formatCurrency,
  formatDate,
} from "../../lib/utils";
import { aiApiService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  onAddTransaction: (data: Omit<Transaction, "id">) => Promise<void>;
  onDeleteTransaction: (
    transactionId: string,
    accountId: string,
    amount: number,
    type: string,
  ) => Promise<void>;
  isOpenAddModal: boolean;
  setIsOpenAddModal: (open: boolean) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  accounts,
  onAddTransaction,
  onDeleteTransaction,
  isOpenAddModal,
  setIsOpenAddModal,
}) => {
  const { userProfile, user } = useAuth();
  const currency = userProfile?.preferredCurrency || "INR";

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");

  // Form State for Add Transaction
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [category, setCategory] = useState<string>("Food & Dining");
  const [merchant, setMerchant] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Receipt Scanner Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [analyzingReceipt, setAnalyzingReceipt] = useState(false);

  // CSV Import Modal State
  const [showCSVImportModal, setShowCSVImportModal] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importingCSV, setImportingCSV] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);

  // Filtered List
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.merchant &&
          t.merchant.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat =
        selectedCategory === "all" || t.category === selectedCategory;
      const matchType = selectedType === "all" || t.type === selectedType;
      const matchAcc =
        selectedAccount === "all" || t.accountId === selectedAccount;

      return matchSearch && matchCat && matchType && matchAcc;
    });
  }, [
    transactions,
    searchTerm,
    selectedCategory,
    selectedType,
    selectedAccount,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Please enter a valid positive amount.");
      return;
    }

    const targetAccId = accountId || accounts[0]?.id;
    if (!targetAccId) {
      setFormError("Please select an account.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Omit<Transaction, "id"> = {
        userId: user?.uid || "",
        accountId: targetAccId,
        amount: numAmount,
        currency,
        type,
        category,
        description: description.trim() || category,
        date: date || new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (merchant.trim()) payload.merchant = merchant.trim();
      if (notes.trim()) payload.notes = notes.trim();

      await onAddTransaction(payload);

      // Reset form & close
      setAmount("");
      setMerchant("");
      setDescription("");
      setNotes("");
      setIsOpenAddModal(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to save transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  // Receipt Scanner Image Handler
  const handleReceiptUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingReceipt(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const mime =
            file.type ||
            (file.name.endsWith(".webp") ? "image/webp" : "image/jpeg");
          const result = await aiApiService.analyzeReceipt(
            base64,
            mime,
            DEFAULT_CATEGORIES.map((c) => c.name),
          );

          if (result.total) setAmount(result.total.toString());
          if (result.merchant) setMerchant(result.merchant);
          if (result.date) setDate(result.date);
          if (result.suggestedCategory) setCategory(result.suggestedCategory);
          if (result.merchant) setDescription(`Receipt at ${result.merchant}`);

          setShowReceiptModal(false);
          setIsOpenAddModal(true);
        } catch (err: any) {
          console.error("Receipt AI processing failed:", err);
          alert(
            `Receipt analysis failed: ${err.message || "Please enter details manually."}`,
          );
        } finally {
          setAnalyzingReceipt(false);
        }
      };
      reader.onerror = () => {
        setAnalyzingReceipt(false);
        alert("Could not read image file.");
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("Receipt processing failed:", err);
      setAnalyzingReceipt(false);
      alert("Could not analyze receipt image.");
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers =
      "Date,Description,Category,Type,Amount,Currency,Account,Merchant\n";
    const rows = transactions
      .map(
        (t) =>
          `"${t.date}","${t.description.replace(/"/g, '""')}","${t.category}","${t.type}",${t.amount},"${t.currency}","${t.accountId}","${t.merchant || ""}"`,
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Hisaab_Transactions_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Parses a single CSV line while respecting quoted fields (so commas inside
  // quotes, e.g. in a description, don't split into extra columns).
  const parseCSVLine = (line: string): string[] => {
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cols.push(current.trim());
    return cols;
  };

  // CSV Import Parser
  const handleCSVImport = async () => {
    if (!csvText.trim()) {
      setCsvResult("Please paste some CSV data first.");
      return;
    }

    if (!accounts[0]?.id) {
      setCsvResult(
        "No account found. Please create an account first before importing transactions.",
      );
      return;
    }

    setImportingCSV(true);
    setCsvResult(null);

    try {
      const lines = csvText.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        setCsvResult("No valid rows found in the pasted CSV data.");
        return;
      }

      // Only skip the first row if it actually looks like a header
      // (contains "date" and "amount" as words, case-insensitive), so a
      // header-less paste of pure data rows isn't silently dropped.
      const firstLineLower = lines[0].toLowerCase();
      const startIndex =
        firstLineLower.includes("date") && firstLineLower.includes("amount")
          ? 1
          : 0;

      let importedCount = 0;
      let skippedCount = 0;

      for (let i = startIndex; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]).map((c) => c.replace(/^"|"$/g, ""));

        // Require all 5 columns: Date, Description, Category, Type, Amount
        if (cols.length < 5) {
          skippedCount++;
          continue;
        }

        const rawDate = cols[0] || new Date().toISOString().split("T")[0];
        const rawDesc = cols[1] || "Imported Expense";
        const rawCat = cols[2] || "Other";
        const rawType = (cols[3] || "expense").toLowerCase() as TransactionType;
        const rawAmt = parseFloat(cols[4]);

        if (isNaN(rawAmt) || rawAmt <= 0) {
          skippedCount++;
          continue;
        }

        await onAddTransaction({
          userId: user?.uid || "",
          accountId: accounts[0].id,
          amount: rawAmt,
          currency,
          type: rawType === "income" ? "income" : "expense",
          category: rawCat,
          description: rawDesc,
          date: rawDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        importedCount++;
      }

      if (importedCount === 0) {
        setCsvResult(
          `No transactions were imported. ${skippedCount} row(s) were skipped due to invalid or missing data. Check the format: Date,Description,Category,Type,Amount`,
        );
      } else {
        setCsvResult(
          `Successfully imported ${importedCount} transaction(s).${
            skippedCount > 0
              ? ` (${skippedCount} row(s) skipped due to invalid data.)`
              : ""
          }`,
        );
        setCsvText("");
      }
    } catch (err: any) {
      console.error("CSV import failed:", err);
      setCsvResult(`Import failed: ${err.message || "Unknown error"}`);
    } finally {
      setImportingCSV(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Transaction Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View, search, filter, and manage your financial records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowReceiptModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 shadow-2xs"
          >
            <Camera className="h-4 w-4 text-emerald-600" />
            Scan Receipt AI
          </button>

          <button
            onClick={() => setShowCSVImportModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 shadow-2xs"
          >
            <Download className="h-4 w-4" />
            Import CSV
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 shadow-2xs"
          >
            <Upload className="h-4 w-4" />
            Export CSV
          </button>

          <button
            onClick={() => setIsOpenAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Transaction
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search description, category, merchant..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All Categories</option>
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All Types</option>
            <option value="expense">Expenses Only</option>
            <option value="income">Income Only</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description & Merchant</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTransactions.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {t.description}
                    </p>
                    {t.merchant && (
                      <p className="text-[10px] text-slate-400">
                        At {t.merchant}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-bold ${
                        t.type === "income"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-extrabold ${
                      t.type === "income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatCurrency(t.amount, currency)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() =>
                        onDeleteTransaction(t.id, t.accountId, t.amount, t.type)
                      }
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 transition"
                      title="Delete transaction"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Receipt className="mx-auto h-8 w-8 mb-2 stroke-1" />
                    No transactions match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isOpenAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Add Transaction
              </h3>
              <button
                onClick={() => setIsOpenAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setType("expense")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                    type === "expense"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType("income")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                    type === "income"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Income
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Amount ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-extrabold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Account
                  </label>
                  <select
                    value={accountId || accounts[0]?.id || ""}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (
                        {formatCurrency(acc.currentBalance, currency)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Grocery shopping at D-Mart"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Merchant (Optional)
                </label>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="e.g. D-Mart, Swiggy, Uber"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenAddModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                >
                  {submitting ? "Saving..." : "Save Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Scanner AI Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Scan Receipt with Hisaab AI
              </h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Upload a receipt image (JPG, PNG). Hisaab AI will extract
              merchant, total, date, and suggested category.
            </p>

            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <Camera className="mx-auto h-10 w-10 text-emerald-600 mb-3" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                {analyzingReceipt
                  ? "Analyzing receipt image with Hisaab AI..."
                  : "Click to select or drag receipt image"}
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleReceiptUpload}
                disabled={analyzingReceipt}
                className="mt-2 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCSVImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                Import Transactions CSV
              </h3>
              <button
                onClick={() => setShowCSVImportModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {csvResult && (
              <div className="mb-3 rounded-xl bg-slate-100 p-3 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                {csvResult}
              </div>
            )}

            <p className="text-xs text-slate-500 mb-2">
              Paste CSV rows format:{" "}
              <code>Date,Description,Category,Type,Amount</code>
            </p>

            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Date,Description,Category,Type,Amount&#10;2026-08-10,Grocery Purchase,Food & Dining,expense,1250&#10;2026-08-11,Monthly Salary,Salary / Income,income,85000"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowCSVImportModal(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Close
              </button>
              <button
                onClick={handleCSVImport}
                disabled={importingCSV || !csvText.trim()}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
              >
                {importingCSV ? "Importing..." : "Start CSV Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
