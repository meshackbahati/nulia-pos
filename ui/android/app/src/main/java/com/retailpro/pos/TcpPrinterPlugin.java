package com.retailpro.pos;

import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;

@CapacitorPlugin(name = "TcpPrinter")
public class TcpPrinterPlugin extends Plugin {

    private static final String TAG = "TcpPrinter";
    private static final int DEFAULT_TIMEOUT = 10000;

    @PluginMethod
    public void print(PluginCall call) {
        String ip = call.getString("ip");
        Integer port = call.getInt("port", 9100);
        String data = call.getString("data");

        if (ip == null || ip.isEmpty()) {
            call.reject("IP address is required");
            return;
        }

        if (data == null || data.isEmpty()) {
            call.reject("Print data is required");
            return;
        }

        new Thread(() -> {
            Socket socket = null;
            try {
                byte[] bytes = Base64.decode(data, Base64.DEFAULT);

                Log.d(TAG, "Connecting to " + ip + ":" + port + " (" + bytes.length + " bytes)");

                socket = new Socket();
                socket.connect(new InetSocketAddress(ip, port), DEFAULT_TIMEOUT);
                socket.setSoTimeout(DEFAULT_TIMEOUT);

                OutputStream out = socket.getOutputStream();
                out.write(bytes);
                out.flush();

                Log.d(TAG, "Print data sent successfully");

                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            } catch (Exception e) {
                Log.e(TAG, "Print failed: " + e.getMessage(), e);
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", e.getMessage());
                call.resolve(result);
            } finally {
                if (socket != null) {
                    try {
                        socket.close();
                    } catch (Exception ignored) {}
                }
            }
        }).start();
    }

    @PluginMethod
    public void testConnection(PluginCall call) {
        String ip = call.getString("ip");
        Integer port = call.getInt("port", 9100);

        if (ip == null || ip.isEmpty()) {
            call.reject("IP address is required");
            return;
        }

        new Thread(() -> {
            Socket socket = null;
            try {
                socket = new Socket();
                socket.connect(new InetSocketAddress(ip, port), 5000);
                socket.close();

                JSObject result = new JSObject();
                result.put("reachable", true);
                call.resolve(result);
            } catch (Exception e) {
                JSObject result = new JSObject();
                result.put("reachable", false);
                result.put("error", e.getMessage());
                call.resolve(result);
            } finally {
                if (socket != null) {
                    try { socket.close(); } catch (Exception ignored) {}
                }
            }
        }).start();
    }
}
