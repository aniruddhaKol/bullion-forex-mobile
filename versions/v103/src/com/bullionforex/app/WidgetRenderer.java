package com.bullionforex.app;

import android.content.Context;
import android.graphics.*;
import org.json.JSONObject;
import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public final class WidgetRenderer {
    private static final int GOLD=0xffffdf4f;
    private static Bitmap artwork;
    private static final String[] METALS={"gold","silver","platinum"},FX={"usd","eur","gbp"};
    // Each scanline is bounded by the outer gold frame. Interior pixels are preserved,
    // including dark ornament that connects through small gaps in the gold artwork.
    private static Bitmap transparentExterior(Bitmap source) {
        Bitmap output=source.copy(Bitmap.Config.ARGB_8888,true);
        int width=output.getWidth(),height=output.getHeight();
        int[] colors=new int[width*height];
        output.getPixels(colors,0,width,0,0,width,height);
        for(int y=0;y<height;y++) {
            int left=width,right=-1;
            for(int x=0;x<width;x++) {
                int color=colors[y*width+x];
                if(Color.red(color)>=85&&Color.green(color)>=75&&Color.red(color)>Color.blue(color)*1.15f) {
                    left=Math.min(left,x);right=x;
                }
            }
            if(right>=left) {left=Math.max(0,left-1);right=Math.min(width-1,right+1);}
            for(int x=0;x<width;x++)if(x<left||x>right)colors[y*width+x]=Color.TRANSPARENT;
        }
        output.setPixels(colors,0,width,0,0,width,height);
        return output;
    }
    public static String amount(JSONObject rates,String key) {
        if(!WidgetStore.valid(rates,key.equals("usd")||key.equals("eur")||key.equals("gbp")?"forex":"bullion"))return "--";
        if(key.equals("usd")||key.equals("eur")||key.equals("gbp"))return String.format(Locale.US,"%.2f",rates.optDouble(key));
        String s=Long.toString(Math.round(rates.optDouble(key)));
        if(s.length()<=3)return s;
        String head=s.substring(0,s.length()-3),tail=s.substring(s.length()-3);
        return head.replaceAll("(\\d)(?=(\\d{2})+$)","$1,")+","+tail;
    }
    private static String collected(JSONObject rates,String group) {
        long stamp=rates.optLong(group+"FetchedAt",rates.optLong("fetchedAt",0));
        return WidgetStore.valid(rates,group)&&stamp>0?new SimpleDateFormat("dd MMM",Locale.US).format(new Date(stamp)).toUpperCase(Locale.US):"--";
    }
    public static String description(JSONObject rates) {
        return "Bullion Forex. Gold per 10 g: ₹"+amount(rates,"gold")+". Silver per 100 g: ₹"+amount(rates,"silver")+". Platinum per 10 g: ₹"+amount(rates,"platinum")+". USD: "+amount(rates,"usd")+". EUR: "+amount(rates,"eur")+". GBP: "+amount(rates,"gbp")+". Tap to open and check rates.";
    }
    private static void text(Canvas canvas,Paint paint,String value,float left,float top,float width,float height,float size,int color,boolean right) {
        paint.setColor(color);paint.setTypeface(Typeface.create("sans-serif",Typeface.BOLD));paint.setTextSize(size);
        while(paint.measureText(value)>width&&paint.getTextSize()>4)paint.setTextSize(paint.getTextSize()-.25f);
        Paint.FontMetrics metrics=paint.getFontMetrics();
        float x=right?left+width-paint.measureText(value):left+(width-paint.measureText(value))/2;
        float y=top+height/2-(metrics.ascent+metrics.descent)/2;
        canvas.drawText(value,x,y,paint);
    }
    private static void bullion(Canvas canvas,Paint paint,JSONObject rates,String key,float y) {
        String value=amount(rates,key),prefix=value.equals("--")?"":"₹ ";
        paint.setTypeface(Typeface.create("serif",Typeface.BOLD));paint.setTextSize(30);
        while(paint.measureText(prefix+value)>142&&paint.getTextSize()>8)paint.setTextSize(paint.getTextSize()-.25f);
        Paint.FontMetrics metrics=paint.getFontMetrics();float baseline=y+20-(metrics.ascent+metrics.descent)/2;
        float x=388-paint.measureText(prefix+value);paint.setColor(GOLD);canvas.drawText(prefix,x,baseline,paint);
        paint.setColor(Color.WHITE);canvas.drawText(value,x+paint.measureText(prefix),baseline,paint);
    }
    public static synchronized Bitmap render(Context context,float width,float height,JSONObject rates) {
        width=Math.max(100,Math.min(900,width));height=Math.max(70,Math.min(1000,height));
        float pixels=Math.min(1.5f,640f/Math.max(width,height));
        Bitmap bitmap=Bitmap.createBitmap(Math.max(1,Math.round(width*pixels)),Math.max(1,Math.round(height*pixels)),Bitmap.Config.ARGB_8888);
        Canvas canvas=new Canvas(bitmap);canvas.scale(pixels,pixels);Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
        if(height>=width*1.10f&&width>=210) {
            float scale=Math.min((width-8)/432,(height-24)/514),x=(width-432*scale)/2,y=(height-20-514*scale)/2;
            canvas.save();canvas.translate(x,y);canvas.scale(scale,scale);
            try { if(artwork==null)try(java.io.InputStream input=context.getAssets().open("background.png")){
                BitmapFactory.Options options=new BitmapFactory.Options();options.inSampleSize=2;
                Bitmap decoded=BitmapFactory.decodeStream(input,null,options);
                artwork=transparentExterior(decoded);decoded.recycle();
            } }catch(Exception error){}
            if(artwork!=null)canvas.drawBitmap(artwork,null,new RectF(0,0,432,514),paint);
            text(canvas,paint,"INR",92,78,111,43,34,GOLD,false);
            text(canvas,paint,"MET "+collected(rates,"bullion"),226,88,119,23,14,GOLD,false);
            bullion(canvas,paint,rates,"gold",160);bullion(canvas,paint,rates,"silver",228);bullion(canvas,paint,rates,"platinum",297);
            for(int i=0;i<3;i++)text(canvas,paint,amount(rates,FX[i]),new float[]{37,162,285}[i],390,new float[]{112,108,112}[i],42,30,Color.WHITE,false);
            canvas.restore();
            text(canvas,paint,"FX "+collected(rates,"forex")+" · SAVED · TAP TO CHECK",8,height-22,width-16,18,10,0xffd2bd78,false);
        } else {
            paint.setColor(0xff0c0b08);canvas.drawRoundRect(new RectF(1,1,width-1,height-1),16,16,paint);
            paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(1.5f);paint.setColor(0xffb59b43);canvas.drawRoundRect(new RectF(1,1,width-1,height-1),16,16,paint);paint.setStyle(Paint.Style.FILL);
            boolean wide=width>=300&&height<width*.60f;
            float titleHeight=Math.min(30,height*.18f),footerHeight=Math.min(23,height*.14f);
            text(canvas,paint,"BULLION · FOREX",10,4,width-20,titleHeight,Math.min(17,width*.07f),GOLD,false);
            int cols=wide?3:2,rows=wide?2:3;float rowHeight=(height-titleHeight-footerHeight-12)/rows,cellWidth=(width-20)/cols;
            String[] keys=wide?new String[]{"gold","silver","platinum","usd","eur","gbp"}:new String[]{"gold","usd","silver","eur","platinum","gbp"};
            for(int i=0;i<6;i++) {
                String key=keys[i];boolean metal=key.equals("gold")||key.equals("silver")||key.equals("platinum");
                String label=key.equals("gold")?"GOLD 24K · 10 G":key.equals("silver")?"SILVER · 100 G":key.equals("platinum")?"PLATINUM · 10 G":key.toUpperCase(Locale.US)+" → INR";
                float left=10+(i%cols)*cellWidth,top=titleHeight+7+(i/cols)*rowHeight;
                text(canvas,paint,label,left+3,top,cellWidth-6,rowHeight*.38f,Math.min(10,rowHeight*.22f),0xffcfbe83,false);
                text(canvas,paint,(metal?"₹ ":"")+amount(rates,key),left+3,top+rowHeight*.38f,cellWidth-6,rowHeight*.60f,Math.min(23,rowHeight*.40f),Color.WHITE,false);
            }
            text(canvas,paint,"MET "+collected(rates,"bullion")+" · FX "+collected(rates,"forex")+" · TAP TO CHECK",10,height-footerHeight-2,width-20,footerHeight,Math.min(10,footerHeight*.6f),0xff9c9277,false);
        }
        return bitmap;
    }
}

