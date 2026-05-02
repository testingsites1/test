import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  const webRef = useRef(null);
  const [active, setActive] = useState('dashboard');

  // 🔥 This sends command to your website
  const navigate = (panel) => {
    setActive(panel);

    webRef.current.injectJavaScript(`
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.getElementById('panel-${panel}').classList.add('active');
      true;
    `);
  };

  return (
    <View style={styles.container}>

      {/* 🌐 WEBVIEW */}
      <WebView
        ref={webRef}
        source={{ uri: 'https://mangoes2746.github.io/Lifeflow/' }}
        javaScriptEnabled
        domStorageEnabled
      />

      {/* 🔻 NATIVE BOTTOM NAV */}
      <View style={styles.nav}>

        <NavItem label="Home" icon="home" active={active === 'dashboard'} onPress={() => navigate('dashboard')} />
        <NavItem label="Notes" icon="document-text" active={active === 'notes'} onPress={() => navigate('notes')} />
        <NavItem label="Goals" icon="trophy" active={active === 'goals'} onPress={() => navigate('goals')} />
        <NavItem label="Focus" icon="timer" active={active === 'focus'} onPress={() => navigate('focus')} />

      </View>
    </View>
  );
}

// 🔘 Button component
function NavItem({ label, icon, active, onPress }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <Ionicons
        name={icon}
        size={22}
        color={active ? '#c2714f' : 'gray'}
      />
      <Text style={{ color: active ? '#c2714f' : 'gray', fontSize: 12 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  nav: {
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },

  item: {
    alignItems: 'center',
  },
});
