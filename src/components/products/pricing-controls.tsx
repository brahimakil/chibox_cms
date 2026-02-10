"use client";

import { useState, useEffect } from "react";
import { DollarSign, Percent, Save, Loader2 } from "lucide-react";

interface PricingControlsProps {
  markupPercent: number;
  exchangeRate: number;
  onSaved: () => void;
}

export function PricingControls({
  markupPercent,
  exchangeRate,
  onSaved,
}: PricingControlsProps) {
  const [markup, setMarkup] = useState(markupPercent);
  const [rate, setRate] = useState(exchangeRate);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync with props when data loads from API
  useEffect(() => {
    if (!dirty) {
      setMarkup(markupPercent);
    }
  }, [markupPercent, dirty]);

  useEffect(() => {
    if (!dirty) {
      setRate(exchangeRate);
    }
  }, [exchangeRate, dirty]);

  const handleMarkupChange = (value: string) => {
    const num = Number.parseFloat(value);
    if (!Number.isNaN(num)) {
      setMarkup(num);
      setDirty(true);
    }
  };

  const handleRateChange = (value: string) => {
    const num = Number.parseFloat(value);
    if (!Number.isNaN(num)) {
      setRate(num);
      setDirty(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markupPercent: markup, exchangeRate: rate }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setDirty(false);
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-3">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
        Global Pricing:
      </span>

      {/* Markup */}
      <div className="flex items-center gap-1.5">
        <Percent className="h-4 w-4 text-muted-foreground" />
        <label htmlFor="pricing-markup" className="text-sm text-muted-foreground">Markup</label>
        <input
          id="pricing-markup"
          type="number"
          step="0.5"
          min="0"
          max="200"
          value={markup}
          onChange={(e) => handleMarkupChange(e.target.value)}
          className="h-8 w-20 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>

      {/* Exchange Rate */}
      <div className="flex items-center gap-1.5">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <label htmlFor="pricing-rate" className="text-sm text-muted-foreground whitespace-nowrap">
          CNY → USD
        </label>
        <input
          id="pricing-rate"
          type="number"
          step="0.001"
          min="0"
          value={rate}
          onChange={(e) => handleRateChange(e.target.value)}
          className="h-8 w-24 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {dirty && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save
        </button>
      )}
    </div>
  );
}
