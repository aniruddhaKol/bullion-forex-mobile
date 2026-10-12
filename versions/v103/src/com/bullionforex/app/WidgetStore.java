package com.bullionforex.app;

import android.content.Context;
import org.json.JSONObject;

public final class WidgetStore {
    public static JSONObject read(Context context) {
        try { return new JSONObject(context.getSharedPreferences("widget-rates",0).getString("rates","{}")); }
        catch(Exception error) { return new JSONObject(); }
    }
    public static boolean valid(JSONObject rates,String group) {
        String[] keys=group.equals("bullion")?new String[]{"gold","silver","platinum"}:new String[]{"usd","eur","gbp"};
        for(String key:keys) { double value=rates.optDouble(key,Double.NaN); if(!Double.isFinite(value)||value<=0)return false; }
        return true;
    }
    public static void save(Context context,String data) {
        if(data==null||data.length()>16384)return;
        try {
            JSONObject incoming=new JSONObject(data),next=read(context);
            for(String group:new String[]{"bullion","forex"}) {
                if(!valid(incoming,group))continue;
                String[] keys=group.equals("bullion")?new String[]{"gold","silver","platinum","goldAt","silverAt","platinumAt","bullionInr","bullionFetchedAt"}:new String[]{"usd","eur","gbp","fxDate","forexFetchedAt"};
                for(String key:keys) if(incoming.has(key))next.put(key,incoming.get(key));
                if(!incoming.has(group+"FetchedAt")&&incoming.has("fetchedAt"))next.put(group+"FetchedAt",incoming.get("fetchedAt"));
            }
            context.getSharedPreferences("widget-rates",0).edit().putString("rates",next.toString()).apply();
            BullionWidget.updateAll(context);
        } catch(Exception error) { android.util.Log.w("BullionWidget","Could not save widget rates",error); }
    }
}
