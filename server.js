const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const SPORTYBET_BASE = process.env.SPORTYBET_API_BASE_URL || "https://www.sportybet.com";

app.use(express.static(path.join(__dirname, "public")));
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "Stats Checks backend" }));

function firstArray(...values) {
  return values.find(Array.isArray) || [];
}

function normalizeLeg(leg) {
  const markets = Array.isArray(leg.markets)
    ? leg.markets
    : [];

  const marketDetails = markets.flatMap(market => {
    const outcomes = Array.isArray(market.outcomes)
      ? market.outcomes
      : [];

    return outcomes.map(outcome => ({
      marketName:
        market.marketName ??
        market.marketDesc ??
        market.desc ??
        market.name ??
        "",
      outcomeName:
        outcome.outcomeName ??
        outcome.outcomeDesc ??
        outcome.name ??
        outcome.desc ??
        "",
      odds:
        outcome.odds ??
        outcome.currentOdds ??
        outcome.odd ??
        ""
    }));
  });

  return {
    homeTeamName: leg.homeTeamName ?? leg.homeTeam ?? "",
    awayTeamName: leg.awayTeamName ?? leg.awayTeam ?? "",
    eventName: leg.eventName ?? leg.event ?? "",
    marketName:
      marketDetails.map(item => item.marketName).filter(Boolean).join(", "),
    outcomeName:
      marketDetails.map(item => item.outcomeName).filter(Boolean).join(", "),
    odds:
      marketDetails.map(item => item.odds).filter(Boolean).join(", "),
    kickoffTime:
      leg.kickoffTime ?? leg.estimateStartTime ?? leg.startTime ?? "",
    status: leg.status ?? leg.matchStatus ?? ""
  };
}

app.get("/api/booking/:code", async (req, res) => {
  const code = String(req.params.code || "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{4,40}$/.test(code)) {
    return res.status(400).json({ error: "Invalid booking-code format. Use 4–40 letters/numbers only." });
  }

  const url = `${SPORTYBET_BASE}/api/ng/orders/share/${encodeURIComponent(code)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Current-Country": "NG",
        "User-Agent": "StatsChecks/1.0"
      },
      signal: controller.signal
    });

    const rawText = await upstream.text();
    let payload;
    try { payload = JSON.parse(rawText); }
    catch { payload = null; }

    if (!upstream.ok) {
      const detail = payload?.message || payload?.msg || payload?.error;
      return res.status(upstream.status === 404 ? 404 : 502).json({
        error: detail ? `SportyBet lookup failed: ${detail}` :
          (upstream.status === 404
            ? "Booking code was not found or has expired."
            : `SportyBet returned HTTP ${upstream.status}. The endpoint may have changed; try again later.`)
      });
    }

    if (!payload) {
      return res.status(502).json({ error: "SportyBet returned an unexpected response instead of JSON. Its endpoint may have changed." });
    }
    if (payload.bizCode !== undefined && Number(payload.bizCode) !== 10000) {
      const message = payload.message || payload.msg || "The code was not accepted by SportyBet.";
      return res.status(422).json({ error: message });
    }

    const data = payload.data ?? payload.result ?? payload;
    
const rawLegs = firstArray(
  data.outcomes,
  data.selections,
  data.items,
  data.order?.outcomes,
  data.order?.selections,
  data.betSlip?.outcomes,
  data.betSlip?.selections
);

const legs = rawLegs.map(normalizeLeg);

    if (!legs.length) {
      return res.status(422).json({
        error: "SportyBet responded, but no selections could be read. The code may be expired, invalid, or the response format may have changed."
      });
    }

    return res.json({
      ok: true,
      bookingCode: data.shareCode || data.code || code,
      expiresAt: data.deadline || data.expiresAt || null,
      selections: legs,
      
note: "Retrieved from SportyBet's undocumented web endpoint. This is a slip lookup, not a prediction."
    });
  } catch (err) {
    const timedOut = err.name === "AbortError";
    return res.status(502).json({
      error: timedOut
        ? "SportyBet did not respond in time. Try again."
        : "Could not connect to SportyBet. Check your internet connection or try again later."
    });
  } finally {
    clearTimeout(timeout);
  }
});

app.listen(PORT, () => {
  console.log(`Stats Checks running at http://localhost:${PORT}`);
});
