package __PACKAGE__;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RahaWidgetPlugin.class);
        registerPlugin(RahaFriendsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
