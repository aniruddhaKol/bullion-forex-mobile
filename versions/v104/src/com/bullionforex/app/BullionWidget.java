package com.bullionforex.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.os.Bundle;
import android.os.Build;
import android.util.SizeF;
import android.widget.RemoteViews;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import org.json.JSONObject;

public class BullionWidget extends AppWidgetProvider {
    public static void updateAll(Context context) {
        AppWidgetManager manager=AppWidgetManager.getInstance(context);
        for(int id:manager.getAppWidgetIds(new ComponentName(context,BullionWidget.class)))update(context,manager,id);
    }
    @Override public void onUpdate(Context context,AppWidgetManager manager,int[] ids) {
        for(int id:ids)update(context,manager,id);
    }
    @Override public void onAppWidgetOptionsChanged(Context context,AppWidgetManager manager,int id,Bundle options) { update(context,manager,id); }
    private static RemoteViews view(Context context,int id,float width,float height,JSONObject rates) {
        RemoteViews views=new RemoteViews(context.getPackageName(),R.layout.bullion_widget);
        views.setImageViewBitmap(R.id.widget_image,WidgetRenderer.render(context,width,height,rates));
        views.setContentDescription(R.id.widget_image,WidgetRenderer.description(rates));
        Intent open=new Intent(context,MainActivity.class).setAction("com.bullionforex.app.CHECK_WIDGET").putExtra("check_widget",true);
        PendingIntent pending=PendingIntent.getActivity(context,id,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_image,pending);
        return views;
    }
    private static void update(Context context,AppWidgetManager manager,int id) {
        Bundle options=manager.getAppWidgetOptions(id);
        JSONObject rates=WidgetStore.read(context);
        if(Build.VERSION.SDK_INT>=31) {
            ArrayList<SizeF> sizes=options.getParcelableArrayList(AppWidgetManager.OPTION_APPWIDGET_SIZES);
            if(sizes!=null&&!sizes.isEmpty()) {
                Map<SizeF,RemoteViews> mapping=new LinkedHashMap<>();
                for(SizeF size:sizes) { if(mapping.size()>=4)break; mapping.put(size,view(context,id,size.getWidth(),size.getHeight(),rates)); }
                manager.updateAppWidget(id,new RemoteViews(mapping));
                return;
            }
        }
        boolean landscape=context.getResources().getConfiguration().orientation==Configuration.ORIENTATION_LANDSCAPE;
        int width=options.getInt(landscape?AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH:AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,280);
        int height=options.getInt(landscape?AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT:AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT,350);
        manager.updateAppWidget(id,view(context,id,width,height,rates));
    }
}
