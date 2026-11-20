#property strict
#property version   "1.00"
#property description "Read-only MT5 position and history sync for TaskFlow"

input string ApiToken = "";
input string SyncUrl = "https://todolist-app-t9nj.onrender.com/api/trading/mt5/sync";
input int SyncIntervalSeconds = 30;
input int HistoryDays = 365;
input int MaxClosedPositions = 500;
input string ChartSymbol = "";
input ENUM_TIMEFRAMES ChartTimeframe = PERIOD_M5;
input int CandleCount = 200;

string EscapeJson(string value)
{
   StringReplace(value, "\\", "\\\\");
   StringReplace(value, "\"", "\\\"");
   StringReplace(value, "\r", "\\r");
   StringReplace(value, "\n", "\\n");
   StringReplace(value, "\t", "\\t");
   return value;
}

string NumberJson(double value, int digits = 8)
{
   return DoubleToString(value, digits);
}

string IdJson(ulong value)
{
   return "\"" + LongToString((long)value) + "\"";
}

bool ContainsId(ulong &ids[], ulong value)
{
   for(int i = 0; i < ArraySize(ids); i++)
      if(ids[i] == value) return true;
   return false;
}

bool IsPositionOpen(ulong positionId)
{
   for(int i = 0; i < PositionsTotal(); i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if((ulong)PositionGetInteger(POSITION_IDENTIFIER) == positionId) return true;
   }
   return false;
}

bool BuildClosedPosition(ulong positionId, string &json)
{
   if(!HistorySelectByPosition(positionId)) return false;

   double entryVolume = 0.0, entryValue = 0.0;
   double exitVolume = 0.0, exitValue = 0.0;
   double pnl = 0.0, fees = 0.0;
   long openedAt = 0, closedAt = 0;
   string side = "";
   string symbol = "";
   int total = HistoryDealsTotal();

   for(int i = 0; i < total; i++)
   {
      ulong deal = HistoryDealGetTicket(i);
      if(deal == 0) continue;

      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(deal, DEAL_ENTRY);
      if(entry == DEAL_ENTRY_INOUT) return false;

      double volume = HistoryDealGetDouble(deal, DEAL_VOLUME);
      double price = HistoryDealGetDouble(deal, DEAL_PRICE);
      long timeMs = HistoryDealGetInteger(deal, DEAL_TIME_MSC);
      fees += MathAbs(HistoryDealGetDouble(deal, DEAL_COMMISSION) + HistoryDealGetDouble(deal, DEAL_FEE));

      if(entry == DEAL_ENTRY_IN)
      {
         ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(deal, DEAL_TYPE);
         string dealSide = dealType == DEAL_TYPE_BUY ? "buy" : dealType == DEAL_TYPE_SELL ? "sell" : "";
         if(dealSide == "") continue;
         if(side != "" && side != dealSide) return false;
         side = dealSide;
         if(symbol == "") symbol = HistoryDealGetString(deal, DEAL_SYMBOL);
         entryVolume += volume;
         entryValue += price * volume;
         if(openedAt == 0 || timeMs < openedAt) openedAt = timeMs;
      }
      else if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
      {
         exitVolume += volume;
         exitValue += price * volume;
         if(timeMs > closedAt) closedAt = timeMs;
         pnl += HistoryDealGetDouble(deal, DEAL_PROFIT) + HistoryDealGetDouble(deal, DEAL_SWAP);
      }
   }

   if(side == "" || entryVolume <= 0.0 || exitVolume <= 0.0 || openedAt == 0 || closedAt == 0)
      return false;

   json = "{\"positionId\":" + IdJson(positionId)
      + ",\"symbol\":\"" + EscapeJson(symbol) + "\""
      + ",\"type\":\"" + side + "\""
      + ",\"volume\":" + NumberJson(exitVolume)
      + ",\"entryPrice\":" + NumberJson(entryValue / entryVolume)
      + ",\"exitPrice\":" + NumberJson(exitValue / exitVolume)
      + ",\"pnl\":" + NumberJson(pnl, 2)
      + ",\"fees\":" + NumberJson(fees, 2)
      + ",\"openedAt\":" + LongToString(openedAt)
      + ",\"closedAt\":" + LongToString(closedAt) + "}";
   return true;
}

string BuildSnapshot(datetime historyFrom)
{
   string openJson = "";
   string closedJson = "";
   ulong openIds[];
   int openCount = 0;
   int maxOpen = 500;

   for(int i = 0; i < PositionsTotal() && openCount < maxOpen; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;

      ulong positionId = (ulong)PositionGetInteger(POSITION_IDENTIFIER);
      ArrayResize(openIds, openCount + 1);
      openIds[openCount++] = positionId;

      if(openJson != "") openJson += ",";
      ENUM_POSITION_TYPE positionType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      string side = positionType == POSITION_TYPE_BUY ? "buy" : "sell";
      openJson += "{\"positionId\":" + IdJson(positionId)
         + ",\"symbol\":\"" + EscapeJson(PositionGetString(POSITION_SYMBOL)) + "\""
         + ",\"type\":\"" + side + "\""
         + ",\"volume\":" + NumberJson(PositionGetDouble(POSITION_VOLUME))
         + ",\"entryPrice\":" + NumberJson(PositionGetDouble(POSITION_PRICE_OPEN))
         + ",\"currentPrice\":" + NumberJson(PositionGetDouble(POSITION_PRICE_CURRENT))
         + ",\"stopLoss\":" + NumberJson(PositionGetDouble(POSITION_SL))
         + ",\"takeProfit\":" + NumberJson(PositionGetDouble(POSITION_TP))
         + ",\"floatingPnl\":" + NumberJson(PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP), 2)
         + ",\"openedAt\":" + LongToString(PositionGetInteger(POSITION_TIME_MSC)) + "}";
   }

   ulong closedIds[];
   int closedIdCount = 0;
   int maxClosed = MathMin(MathMax(MaxClosedPositions, 1), 500);
   long cutoff = ((long)TimeCurrent() - (long)MathMax(HistoryDays, 1) * 86400) * 1000;

   if(HistorySelect(historyFrom, TimeCurrent()))
   {
      int dealCount = HistoryDealsTotal();
      for(int i = dealCount - 1; i >= 0 && closedIdCount < maxClosed; i--)
      {
         ulong deal = HistoryDealGetTicket(i);
         if(deal == 0) continue;
         ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(deal, DEAL_ENTRY);
         if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY) continue;
         if(HistoryDealGetInteger(deal, DEAL_TIME_MSC) < cutoff) continue;

         ulong positionId = (ulong)HistoryDealGetInteger(deal, DEAL_POSITION_ID);
         if(positionId == 0 || ContainsId(openIds, positionId) || ContainsId(closedIds, positionId)) continue;
         ArrayResize(closedIds, closedIdCount + 1);
         closedIds[closedIdCount++] = positionId;
      }
   }

   for(int i = 0; i < closedIdCount; i++)
   {
      string tradeJson;
      if(!BuildClosedPosition(closedIds[i], tradeJson)) continue;
      if(closedJson != "") closedJson += ",";
      closedJson += tradeJson;
   }

   string accountLogin = LongToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string accountServer = EscapeJson(AccountInfoString(ACCOUNT_SERVER));
   string chartJson = "";
   string chartSymbol = ChartSymbol == "" ? _Symbol : ChartSymbol;
   MqlRates rates[];
   int requestedCandles = MathMin(MathMax(CandleCount, 20), 500);
   int copiedCandles = CopyRates(chartSymbol, ChartTimeframe, 0, requestedCandles, rates);
   if(copiedCandles > 0)
   {
      string candlesJson = "";
      for(int i = 0; i < copiedCandles; i++)
      {
         if(candlesJson != "") candlesJson += ",";
         candlesJson += "{\"time\":" + LongToString((long)rates[i].time)
            + ",\"open\":" + NumberJson(rates[i].open)
            + ",\"high\":" + NumberJson(rates[i].high)
            + ",\"low\":" + NumberJson(rates[i].low)
            + ",\"close\":" + NumberJson(rates[i].close)
            + ",\"volume\":" + LongToString((long)rates[i].tick_volume) + "}";
      }
      string timeframe = EnumToString(ChartTimeframe);
      StringReplace(timeframe, "PERIOD_", "");
      chartJson = ",\"chart\":{\"symbol\":\"" + EscapeJson(chartSymbol)
         + "\",\"timeframe\":\"" + timeframe + "\",\"candles\":[" + candlesJson + "]}";
   }
   else
   {
      Print("TaskFlow MT5: waiting for price history for ", chartSymbol, " ", EnumToString(ChartTimeframe));
   }

   return "{\"version\":1,\"account\":{\"login\":\"" + accountLogin + "\",\"server\":\"" + accountServer + "\"}"
      + ",\"openPositions\":[" + openJson + "]"
      + ",\"closedPositions\":[" + closedJson + "]" + chartJson + "}";
}

void SyncNow()
{
   if(StringLen(ApiToken) < 70)
   {
      Print("TaskFlow MT5: enter the connection token in the EA's ApiToken input.");
      return;
   }

   string cursorName = "TaskFlowMT5_" + LongToString(AccountInfoInteger(ACCOUNT_LOGIN))
      + "_" + StringSubstr(ApiToken, StringLen(ApiToken) - 16);
   datetime historyFrom = TimeCurrent() - MathMax(HistoryDays, 1) * 86400;
   if(GlobalVariableCheck(cursorName))
      historyFrom = (datetime)MathMax(0, (long)GlobalVariableGet(cursorName) - 120);

   string json = BuildSnapshot(historyFrom);
   char data[], response[];
   string requestHeaders = "Authorization: Bearer " + ApiToken + "\r\nContent-Type: application/json\r\n";
   string responseHeaders;
   int dataLength = StringToCharArray(json, data, 0, WHOLE_ARRAY, CP_UTF8);
   if(dataLength > 0) ArrayResize(data, dataLength - 1);

   ResetLastError();
   int status = WebRequest("POST", SyncUrl, requestHeaders, 10000, data, response, responseHeaders);
   if(status == -1)
   {
      Print("TaskFlow MT5 sync failed. Check WebRequest URL permissions and connection. Error: ", GetLastError());
      return;
   }
   if(status < 200 || status >= 300)
   {
      Print("TaskFlow MT5 sync returned HTTP ", status, ": ", CharArrayToString(response, 0, -1, CP_UTF8));
      return;
   }
   GlobalVariableSet(cursorName, (double)TimeCurrent());
   Print("TaskFlow MT5 sync completed. ", CharArrayToString(response, 0, -1, CP_UTF8));
}

int OnInit()
{
   if(AccountInfoInteger(ACCOUNT_MARGIN_MODE) != ACCOUNT_MARGIN_MODE_RETAIL_HEDGING)
   {
      Print("TaskFlow MT5 sync currently requires a hedging account. Netting positions are not synced to prevent inaccurate trade history.");
      return INIT_FAILED;
   }
   EventSetTimer(MathMax(SyncIntervalSeconds, 10));
   SyncNow();
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTimer()
{
   SyncNow();
}
