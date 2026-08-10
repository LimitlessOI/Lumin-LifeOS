package org.hopkinsgroup.lifeos.gallery;

import android.Manifest;
import android.database.Cursor;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Reads photos from the device gallery via Android's real MediaStore content
 * provider -- a completely standard, well-supported Android capability (the
 * same one any photo/messaging app uses), not something exotic or blocked.
 * Separate from LifeosAccessibilityService, which only sees on-screen UI
 * elements and has no path to actual image bytes.
 */
@CapacitorPlugin(
    name = "LifeosGalleryUpload",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_EXTERNAL_STORAGE }, alias = "photos")
    }
)
public class LifeosGalleryPlugin extends Plugin {

    @PluginMethod
    public void hasAccess(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("photos") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestAccess(PluginCall call) {
        if (getPermissionState("photos") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("photos", call, "photosPermsCallback");
    }

    @PermissionCallback
    private void photosPermsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("photos") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void listPhotos(PluginCall call) {
        if (getPermissionState("photos") != PermissionState.GRANTED) {
            call.reject("permission_not_granted");
            return;
        }
        int limit = call.getInt("limit", 200);

        JSArray photos = new JSArray();
        String[] projection = {
                MediaStore.Images.Media._ID,
                MediaStore.Images.Media.DISPLAY_NAME,
                MediaStore.Images.Media.DATE_ADDED,
                MediaStore.Images.Media.SIZE
        };
        String sortOrder = MediaStore.Images.Media.DATE_ADDED + " DESC";
        try (Cursor cursor = getContext().getContentResolver().query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI, projection, null, null, sortOrder)) {
            if (cursor != null) {
                int idCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID);
                int nameCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME);
                int dateCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED);
                int sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE);
                int count = 0;
                while (cursor.moveToNext() && count < limit) {
                    JSObject item = new JSObject();
                    item.put("id", String.valueOf(cursor.getLong(idCol)));
                    item.put("name", cursor.getString(nameCol));
                    item.put("dateAdded", cursor.getLong(dateCol));
                    item.put("size", cursor.getLong(sizeCol));
                    photos.put(item);
                    count++;
                }
            }
        } catch (Exception e) {
            call.reject("query_failed: " + e.getMessage());
            return;
        }

        JSObject ret = new JSObject();
        ret.put("photos", photos);
        call.resolve(ret);
    }

    @PluginMethod
    public void readPhotoBase64(PluginCall call) {
        if (getPermissionState("photos") != PermissionState.GRANTED) {
            call.reject("permission_not_granted");
            return;
        }
        String idStr = call.getString("id");
        if (idStr == null) {
            call.reject("id is required");
            return;
        }
        long id;
        try {
            id = Long.parseLong(idStr);
        } catch (NumberFormatException e) {
            call.reject("invalid id");
            return;
        }
        Uri uri = Uri.withAppendedPath(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, String.valueOf(id));
        try (InputStream in = getContext().getContentResolver().openInputStream(uri)) {
            if (in == null) {
                call.reject("could_not_open_photo");
                return;
            }
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int read;
            while ((read = in.read(chunk)) != -1) {
                buffer.write(chunk, 0, read);
            }
            String base64 = Base64.encodeToString(buffer.toByteArray(), Base64.NO_WRAP);
            JSObject ret = new JSObject();
            ret.put("base64", base64);
            ret.put("byteLength", buffer.size());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("read_failed: " + e.getMessage());
        }
    }
}
