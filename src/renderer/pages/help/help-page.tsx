/**
 * Help & Support Page
 * Offline knowledge base, FAQ, and quick tips.
 * Matches the Next.js help page structure (without contact form since we're offline).
 */

import { useState } from "react";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Book, MessageCircle, Search, ChevronRight, ArrowLeft,
  Zap, CreditCard, Receipt, Users, BarChart3, ShieldCheck,
  ShoppingCart, Landmark, BookOpen, FolderKanban, Keyboard, Info,
} from "lucide-react";
import { knowledgeBase, faqs, type HelpArticle, type HelpCategory } from "./help-data";

const iconMap: Record<string, any> = {
  Zap, CreditCard, Receipt, Users, BarChart3, ShieldCheck, ShoppingCart, Landmark, BookOpen, FolderKanban,
};

export function HelpPage() {
  const [search, setSearch] = useState("");
  const [activeArticle, setActiveArticle] = useState<HelpArticle | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const q = search.trim().toLowerCase();

  const filteredFaqs = q
    ? faqs.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
    : faqs;

  const filteredArticles = q
    ? knowledgeBase.flatMap((cat) =>
        cat.articles
          .filter((a) =>
            a.title.toLowerCase().includes(q) ||
            a.desc.toLowerCase().includes(q) ||
            a.content.some((s) => s.heading.toLowerCase().includes(q) || s.body.toLowerCase().includes(q))
          )
          .map((a) => ({ ...a, categoryTitle: cat.title, categoryIcon: cat.icon }))
      )
    : [];

  // ── Article Detail View ──
  if (activeArticle) {
    return (
      <div className="flex-1 space-y-6 p-3 sm:p-6 lg:p-8 pt-4 sm:pt-6">
        <Button variant="ghost" size="sm" onClick={() => setActiveArticle(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Knowledge Base
        </Button>
        <div className="max-w-4xl">
          <h1 className="text-2xl font-bold mb-2">{activeArticle.title}</h1>
          <p className="text-muted-foreground mb-6">{activeArticle.desc}</p>
          <div className="space-y-4">
            {activeArticle.content.map((section, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{section.heading}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button variant="outline" onClick={() => setActiveArticle(null)} className="mt-6 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to all guides
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-3 sm:p-6 lg:p-8 pt-4 sm:pt-6">
      <Heading title="Help & Support" description="Browse guides, tips, and answers to common questions" />
      <Separator />

      {/* Search Banner */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
        <CardContent className="pt-6 pb-6">
          <h3 className="text-lg font-semibold mb-3">How can we help you?</h3>
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guides and FAQs..."
              className="pl-10 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {q && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredArticles.length + filteredFaqs.length === 0
                ? `No results for "${search}"`
                : `${filteredArticles.length} article(s) and ${filteredFaqs.length} FAQ(s) found`}
            </p>
            <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="text-emerald-600 text-xs">Clear search</Button>
          </div>

          {filteredArticles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Articles</h3>
              {filteredArticles.map((article) => (
                <Card key={article.slug} className="cursor-pointer hover:border-emerald-500/40 transition-colors" onClick={() => { setActiveArticle(article); setSearch(""); }}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{article.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{(article as any).categoryTitle} · {article.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredFaqs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">FAQs</h3>
              <Card>
                <CardContent className="pt-4">
                  <Accordion type="single" collapsible>
                    {filteredFaqs.slice(0, 10).map((faq, i) => (
                      <AccordionItem key={i} value={`search-faq-${i}`}>
                        <AccordionTrigger className="text-left text-sm">{faq.q}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground text-sm leading-relaxed">{faq.a}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Main Content (hidden during search) */}
      {!q && (
        <Tabs defaultValue="guides" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="guides" className="gap-2"><Book className="h-4 w-4" /> Guides</TabsTrigger>
            <TabsTrigger value="faq" className="gap-2"><MessageCircle className="h-4 w-4" /> FAQ</TabsTrigger>
            <TabsTrigger value="shortcuts" className="gap-2"><Keyboard className="h-4 w-4" /> Shortcuts</TabsTrigger>
          </TabsList>

          {/* Knowledge Base */}
          <TabsContent value="guides">
            {activeCategory ? (
              (() => {
                const cat = knowledgeBase.find((c) => c.key === activeCategory);
                if (!cat) return null;
                const Icon = iconMap[cat.icon] || Book;
                return (
                  <div className="space-y-4">
                    <Button variant="ghost" size="sm" onClick={() => setActiveCategory(null)} className="gap-2">
                      <ArrowLeft className="h-4 w-4" /> All categories
                    </Button>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/30"><Icon className="h-6 w-6 text-emerald-600" /></div>
                      <div>
                        <h2 className="text-xl font-bold">{cat.title}</h2>
                        <p className="text-sm text-muted-foreground">{cat.articles.length} articles</p>
                      </div>
                    </div>
                    <div className="grid gap-3">
                      {cat.articles.map((article) => (
                        <Card key={article.slug} className="cursor-pointer hover:border-emerald-500/40 transition-colors" onClick={() => setActiveArticle(article)}>
                          <CardContent className="py-4 flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{article.title}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">{article.desc}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-4" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {knowledgeBase.map((cat) => {
                  const Icon = iconMap[cat.icon] || Book;
                  return (
                    <Card key={cat.key} className="cursor-pointer hover:border-emerald-500/40 hover:shadow-sm transition-all" onClick={() => setActiveCategory(cat.key)}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/30"><Icon className="h-5 w-5 text-emerald-600" /></div>
                          <div>
                            <CardTitle className="text-base">{cat.title}</CardTitle>
                            <CardDescription>{cat.articles.length} articles</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {cat.articles.slice(0, 3).map((article) => (
                            <li key={article.slug} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <ChevronRight className="h-3 w-3 shrink-0" /> {article.title}
                            </li>
                          ))}
                          {cat.articles.length > 3 && <li className="text-xs text-emerald-600 pl-5">+{cat.articles.length - 3} more</li>}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq">
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>{faqs.length} questions</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keyboard Shortcuts */}
          <TabsContent value="shortcuts">
            <Card>
              <CardHeader>
                <CardTitle>Keyboard Shortcuts</CardTitle>
                <CardDescription>Speed up your workflow with these shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  <ShortcutSection title="Navigation" shortcuts={[
                    { keys: "Ctrl + K", desc: "Open command search" },
                    { keys: "Ctrl + B", desc: "Toggle sidebar" },
                    { keys: "F11", desc: "Toggle fullscreen" },
                  ]} />
                  <ShortcutSection title="POS Terminal" shortcuts={[
                    { keys: "Ctrl + B", desc: "Focus barcode scanner" },
                    { keys: "Ctrl + P / F12", desc: "Open checkout" },
                    { keys: "Ctrl + Delete", desc: "Clear cart" },
                    { keys: "F5", desc: "Refresh products" },
                    { keys: "Escape", desc: "Close modal / clear" },
                  ]} />
                  <ShortcutSection title="Reports" shortcuts={[
                    { keys: "Ctrl + P", desc: "Print current report" },
                    { keys: "Click account name", desc: "Drill down into transactions" },
                  ]} />
                  <ShortcutSection title="General" shortcuts={[
                    { keys: "Escape", desc: "Close dialog / modal" },
                    { keys: "Enter", desc: "Submit form / confirm" },
                    { keys: "Tab", desc: "Navigate between fields" },
                  ]} />
                </div>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-emerald-600" /> Quick Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    "The app works fully offline after license activation.",
                    "Delete the database file at AppData/Roaming/syncbooks-desktop/syncbooks.db to reset.",
                    "Recurring invoices/expenses generate on startup if the app was closed when due.",
                    "POS sales queue offline and sync when the app reconnects (Enterprise only).",
                    "Use 'Run Depreciation' monthly in Fixed Assets to post depreciation entries.",
                    "Close each accounting period after review to prevent accidental edits.",
                    "Export data regularly from Settings → Data Management as a backup.",
                    "Contracts auto-generate invoices based on billing schedule.",
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                      <span className="text-emerald-600 font-bold text-sm shrink-0">💡</span>
                      <p className="text-sm text-muted-foreground">{tip}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ShortcutSection({ title, shortcuts }: { title: string; shortcuts: { keys: string; desc: string }[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      {shortcuts.map((s, i) => (
        <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-muted/50">
          <span className="text-sm text-muted-foreground">{s.desc}</span>
          <kbd className="text-xs font-mono bg-muted px-2 py-0.5 rounded border">{s.keys}</kbd>
        </div>
      ))}
    </div>
  );
}
