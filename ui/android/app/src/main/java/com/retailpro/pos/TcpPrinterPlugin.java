package com.retailpro.pos;

import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.io.OutputStream;
import java.net.ConnectException;
import java.net.InetSocketAddress;
import java.net.NoRouteToHostException;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

@CapacitorPlugin(name = "TcpPrinter")
public class TcpPrinterPlugin extends Plugin {

    private static final String TAG = "TcpPrinter";
    private static final int CONNECT_TIMEOUT_MS = 10000;
    private static final int TEST_TIMEOUT_MS = 5000;

    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final AtomicInteger taskIdGen = new AtomicInteger(0);

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

        int taskId = taskIdGen.incrementAndGet();
        Log.d(TAG, "[" + taskId + "] print() invoked — ip=" + ip + " port=" + port + " data.length=" + data.length());

        executor.execute(() -> {
            long startTime = System.currentTimeMillis();
            Socket socket = null;

            try {
                // --- STEP 1: Decode Base64 ---
                byte[] bytes;
                try {
                    bytes = Base64.decode(data, Base64.DEFAULT);
                } catch (IllegalArgumentException e) {
                    Log.e(TAG, "[" + taskId + "] Base64 decode failed: " + e.getMessage());
                    failWith(call, "Invalid print data encoding: " + e.getMessage());
                    return;
                }
                Log.d(TAG, "[" + taskId + "] Decoded " + bytes.length + " bytes from Base64");

                // --- STEP 2: Create socket ---
                socket = new Socket();
                Log.d(TAG, "[" + taskId + "] Socket created, connecting to " + ip + ":" + port + " (timeout=" + CONNECT_TIMEOUT_MS + "ms)");

                // --- STEP 3: Connect ---
                long connectStart = System.currentTimeMillis();
                socket.connect(new InetSocketAddress(ip, port), CONNECT_TIMEOUT_MS);
                long connectTime = System.currentTimeMillis() - connectStart;
                Log.d(TAG, "[" + taskId + "] Connected in " + connectTime + "ms");

                socket.setSoTimeout(CONNECT_TIMEOUT_MS);

                // --- STEP 4: Get output stream ---
                OutputStream out;
                try {
                    out = socket.getOutputStream();
                } catch (IOException e) {
                    Log.e(TAG, "[" + taskId + "] Failed to get OutputStream: " + e.getMessage());
                    failWith(call, "Failed to obtain output stream: " + e.getMessage());
                    return;
                }
                Log.d(TAG, "[" + taskId + "] OutputStream obtained");

                // --- STEP 5: Write bytes ---
                try {
                    out.write(bytes);
                    Log.d(TAG, "[" + taskId + "] Wrote " + bytes.length + " bytes to socket");
                } catch (IOException e) {
                    Log.e(TAG, "[" + taskId + "] Write failed after " + bytes.length + " bytes: " + e.getMessage());
                    failWith(call, "Failed while writing data to printer: " + e.getMessage());
                    return;
                }

                // --- STEP 6: Flush ---
                try {
                    out.flush();
                    Log.d(TAG, "[" + taskId + "] Flush completed");
                } catch (IOException e) {
                    Log.e(TAG, "[" + taskId + "] Flush failed: " + e.getMessage());
                    failWith(call, "Failed to flush data to printer: " + e.getMessage());
                    return;
                }

                long totalTime = System.currentTimeMillis() - startTime;
                Log.d(TAG, "[" + taskId + "] Print data sent successfully in " + totalTime + "ms");

                // --- STEP 7: Close socket BEFORE resolving (some printers need FIN to print) ---
                try {
                    socket.close();
                    socket = null;
                    Log.d(TAG, "[" + taskId + "] Socket closed");
                } catch (IOException e) {
                    Log.w(TAG, "[" + taskId + "] Socket close warning: " + e.getMessage());
                }

                // --- STEP 8: Resolve to JS (only after socket is fully closed) ---
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("connectTimeMs", connectTime);
                result.put("totalTimeMs", totalTime);
                call.resolve(result);

            } catch (SocketTimeoutException e) {
                long elapsed = System.currentTimeMillis() - startTime;
                Log.e(TAG, "[" + taskId + "] Connection timeout after " + elapsed + "ms: " + e.getMessage());
                failWith(call, "Connection timeout: printer at " + ip + ":" + port + " did not respond within " + CONNECT_TIMEOUT_MS + "ms");

            } catch (ConnectException e) {
                Log.e(TAG, "[" + taskId + "] Connection refused: " + e.getMessage());
                failWith(call, "Connection refused: no printer listening at " + ip + ":" + port + ". Check IP and power.");

            } catch (NoRouteToHostException e) {
                Log.e(TAG, "[" + taskId + "] Host unreachable: " + e.getMessage());
                failWith(call, "Host unreachable: cannot reach " + ip + ". Are they on the same network?");

            } catch (Exception e) {
                Log.e(TAG, "[" + taskId + "] Print failed: " + e.getMessage(), e);
                failWith(call, "Print error: " + e.getMessage());

            } finally {
                if (socket != null) {
                    try {
                        socket.close();
                        Log.d(TAG, "[" + taskId + "] Socket closed in finally block");
                    } catch (Exception ignored) {}
                }
            }
        });
    }

    @PluginMethod
    public void testConnection(PluginCall call) {
        String ip = call.getString("ip");
        Integer port = call.getInt("port", 9100);

        if (ip == null || ip.isEmpty()) {
            call.reject("IP address is required");
            return;
        }

        int taskId = taskIdGen.incrementAndGet();
        Log.d(TAG, "[" + taskId + "] testConnection() invoked — ip=" + ip + " port=" + port);

        executor.execute(() -> {
            long startTime = System.currentTimeMillis();
            Socket socket = null;

            try {
                socket = new Socket();
                Log.d(TAG, "[" + taskId + "] Testing connection to " + ip + ":" + port);

                long connectStart = System.currentTimeMillis();
                socket.connect(new InetSocketAddress(ip, port), TEST_TIMEOUT_MS);
                long connectTime = System.currentTimeMillis() - connectStart;

                Log.d(TAG, "[" + taskId + "] Connection test succeeded in " + connectTime + "ms");

                socket.close();
                socket = null;

                JSObject result = new JSObject();
                result.put("reachable", true);
                result.put("connectTimeMs", connectTime);
                call.resolve(result);

            } catch (SocketTimeoutException e) {
                long elapsed = System.currentTimeMillis() - startTime;
                Log.e(TAG, "[" + taskId + "] Test timeout after " + elapsed + "ms");
                failTestWith(call, "Connection timeout: printer at " + ip + ":" + port + " did not respond within " + TEST_TIMEOUT_MS + "ms");

            } catch (ConnectException e) {
                Log.e(TAG, "[" + taskId + "] Test connection refused");
                failTestWith(call, "Connection refused: no printer at " + ip + ":" + port);

            } catch (NoRouteToHostException e) {
                Log.e(TAG, "[" + taskId + "] Test host unreachable");
                failTestWith(call, "Host unreachable: cannot reach " + ip);

            } catch (Exception e) {
                Log.e(TAG, "[" + taskId + "] Test failed: " + e.getMessage());
                failTestWith(call, "Connection test failed: " + e.getMessage());

            } finally {
                if (socket != null) {
                    try {
                        socket.close();
                    } catch (Exception ignored) {}
                }
            }
        });
    }

    private void failWith(PluginCall call, String message) {
        JSObject result = new JSObject();
        result.put("success", false);
        result.put("error", message);
        call.resolve(result);
    }

    private void failTestWith(PluginCall call, String message) {
        JSObject result = new JSObject();
        result.put("reachable", false);
        result.put("error", message);
        call.resolve(result);
    }
}
