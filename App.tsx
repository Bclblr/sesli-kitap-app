import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useState, type ComponentProps } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

type Book = {
  id: string;
  title: string;
  author: string;
  genre: string;
  paper: string;
  ink: string;
  mark: string;
  progress?: number;
};

const featured: Book = {
  id: 'sherlock', title: 'Kızıl Dosya', author: 'Arthur Conan Doyle',
  genre: 'Polisiye', paper: '#253c35', ink: '#e9d7aa', mark: 'KD',
};

const continuing: Book[] = [
  { id: 'frankenstein', title: 'Frankenstein', author: 'Mary Shelley', genre: 'Gotik roman', paper: '#2c4146', ink: '#d5e0d8', mark: 'F', progress: 72 },
  { id: 'gurur', title: 'Gurur ve Önyargı', author: 'Jane Austen', genre: 'Roman', paper: '#844c42', ink: '#f6dec7', mark: 'GÖ', progress: 26 },
  { id: 'zaman', title: 'Zaman Makinesi', author: 'H. G. Wells', genre: 'Bilimkurgu', paper: '#4b4530', ink: '#eee0aa', mark: 'ZM', progress: 48 },
];

const classics: Book[] = [
  { id: 'dracula', title: 'Dracula', author: 'Bram Stoker', genre: 'Gotik roman', paper: '#692e32', ink: '#f3d6b6', mark: 'D' },
  { id: 'odysseia', title: 'Odysseia', author: 'Homeros', genre: 'Destan', paper: '#d6bb8e', ink: '#302a22', mark: 'O' },
  { id: 'dorian', title: 'Dorian Gray’in Portresi', author: 'Oscar Wilde', genre: 'Roman', paper: '#283b51', ink: '#e7d2a8', mark: 'DG' },
  { id: 'alice', title: 'Alice Harikalar Diyarında', author: 'Lewis Carroll', genre: 'Fantastik', paper: '#43533b', ink: '#e7dfb0', mark: 'A' },
];

type IconName = ComponentProps<typeof Feather>['name'];
type Tab = 'home' | 'search' | 'library' | 'profile';
const tabs: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Ana Sayfa', icon: 'home' },
  { id: 'search', label: 'Ara', icon: 'search' },
  { id: 'library', label: 'Kitaplığım', icon: 'bookmark' },
  { id: 'profile', label: 'Profil', icon: 'user' },
];

function BookCover({ book, large = false }: { book: Book; large?: boolean }) {
  return (
    <View style={[styles.cover, { backgroundColor: book.paper }]} accessible={false}>
      <View style={[styles.coverBorder, { borderColor: book.ink + '68' }]}>
        <Text style={[styles.coverAuthor, { color: book.ink }]} numberOfLines={1}>{book.author}</Text>
        <Text style={[styles.coverMark, large && styles.coverMarkLarge, { color: book.ink }]}>{book.mark}</Text>
        <Text style={[styles.coverTitle, large && styles.coverTitleLarge, { color: book.ink }]} numberOfLines={3}>{book.title}</Text>
      </View>
    </View>
  );
}

function Shelf({ title, books, onOpen }: { title: string; books: Book[]; onOpen: (book: Book) => void }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(158, Math.max(105, (width - 52) / 2.85));

  return (
    <View style={styles.shelf}>
      <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {books.map((book) => (
          <Pressable
            key={book.id}
            accessibilityRole="button"
            accessibilityLabel={book.title + ', ' + book.author}
            onPress={() => onOpen(book)}
            style={({ pressed }) => [{ width: cardWidth }, pressed && styles.pressed]}
          >
            <View style={styles.coverSlot}>
              <BookCover book={book} />
              {book.progress !== undefined && (
                <View style={styles.playOverlay}>
                  <Ionicons name="play" size={19} color="#fff" style={styles.playGlyph} />
                </View>
              )}
            </View>
            {book.progress !== undefined && (
              <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: book.progress }}>
                <View style={[styles.progress, { width: `${book.progress}%` }]} />
              </View>
            )}
            <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function Home() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Book | null>(null);
  const [section, setSection] = useState<Exclude<Tab, 'home'> | null>(null);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          <LinearGradient
            colors={['#34483f', '#24342d', '#111714', '#000000']}
            locations={[0, 0.39, 0.73, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.header}>
            <Ionicons name="headset-outline" size={25} color={accent} />
            <Text style={styles.brand}>Sesli Kitap</Text>
          </View>
          <View style={styles.feature}>
            <View style={styles.featureCover}><BookCover book={featured} large /></View>
            <Text style={styles.featureTitle} accessibilityRole="header">{featured.title}</Text>
            <Text style={styles.featureMeta}>{featured.author} · {featured.genre}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelected(featured)}
              style={({ pressed }) => [styles.listen, pressed && styles.pressed]}
            >
              <Ionicons name="play" size={16} color="#17130e" />
              <Text style={styles.listenText}>Dinle</Text>
            </Pressable>
          </View>
        </View>
        <Shelf title="Dinlemeye Devam Et" books={continuing} onOpen={setSelected} />
        <Shelf title="Klasikler" books={classics} onOpen={setSelected} />
      </ScrollView>
      <View style={[styles.nav, { bottom: Math.max(insets.bottom, 12) }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab.id === 'home' }}
            onPress={() => setSection(tab.id === 'home' ? null : tab.id)}
            style={({ pressed }) => [styles.tab, tab.id === 'home' && styles.activeTab, pressed && styles.pressed]}
          >
            <Feather name={tab.icon} size={21} color={tab.id === 'home' ? '#fff' : '#b3b1ab'} />
            <Text style={[styles.tabText, tab.id === 'home' && styles.activeTabText]} numberOfLines={1}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
      <Modal
        visible={selected !== null || section !== null}
        transparent
        animationType="fade"
        onRequestClose={() => { setSelected(null); setSection(null); }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBody} accessibilityViewIsModal>
            <Text style={styles.modalTitle} accessibilityRole="header">
              {selected?.title ?? tabs.find((tab) => tab.id === section)?.label}
            </Text>
            {selected && <Text style={styles.featureMeta}>{selected.author} · {selected.genre}</Text>}
            <Text style={styles.modalCopy}>
              {selected ? 'Ses kaydı henüz eklenmedi.' : 'Bu bölüm henüz hazır değil.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => { setSelected(null); setSection(null); }}
              style={({ pressed }) => [styles.listen, pressed && styles.pressed]}
            >
              <Text style={styles.listenText}>Kapat</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function App() {
  return <SafeAreaProvider><Home /></SafeAreaProvider>;
}

const accent = '#dfb578';
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  hero: { paddingBottom: 30 },
  header: { minHeight: 58, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { color: '#fff', fontWeight: '700', fontSize: 24, letterSpacing: -0.65 },
  feature: { alignItems: 'center', paddingTop: 8, paddingHorizontal: 20 },
  featureCover: { width: '54%', maxWidth: 200, aspectRatio: 0.75, borderRadius: 8, overflow: 'hidden' },
  featureTitle: { color: '#fff', fontSize: 32, fontWeight: '700', letterSpacing: -0.9, marginTop: 13, textAlign: 'center' },
  featureMeta: { color: '#c6c6bf', fontSize: 13, marginTop: 5, textAlign: 'center' },
  listen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 44, minWidth: 144, paddingHorizontal: 20, marginTop: 14, borderRadius: 24, backgroundColor: '#f1e9dc' },
  listenText: { color: '#17130e', fontSize: 15, fontWeight: '700' },
  shelf: { marginBottom: 26 },
  sectionTitle: { color: '#f7f6f3', fontSize: 22, fontWeight: '700', letterSpacing: -0.45, paddingHorizontal: 20, marginBottom: 12 },
  rail: { paddingHorizontal: 20, gap: 10 },
  coverSlot: { aspectRatio: 0.72, borderRadius: 6, overflow: 'hidden' },
  cover: { flex: 1, padding: 6 },
  coverBorder: { flex: 1, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 5, paddingVertical: 9, alignItems: 'center', justifyContent: 'space-between' },
  coverAuthor: { fontSize: 9, textAlign: 'center' },
  coverMark: { fontSize: 42, fontFamily: serif, textAlign: 'center', opacity: 0.6 },
  coverMarkLarge: { fontSize: 75 },
  coverTitle: { fontFamily: serif, fontSize: 13, textAlign: 'center', fontWeight: '700' },
  coverTitleLarge: { fontSize: 21 },
  playOverlay: { position: 'absolute', top: '50%', left: '50%', width: 40, height: 40, transform: [{ translateX: -20 }, { translateY: -20 }], borderRadius: 20, backgroundColor: '#111a', borderWidth: 1, borderColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  playGlyph: { marginLeft: 2 },
  track: { height: 3, backgroundColor: '#3d3a34', borderRadius: 2, overflow: 'hidden', marginTop: 7 },
  progress: { backgroundColor: accent, height: '100%' },
  bookTitle: { color: '#f7f6f3', fontSize: 13, fontWeight: '600', marginTop: 6 },
  bookAuthor: { color: '#aaa8a0', fontSize: 11, marginTop: 3 },
  nav: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', backgroundColor: '#242522', borderWidth: StyleSheet.hairlineWidth, borderColor: '#50504a', borderRadius: 32, padding: 5, maxWidth: 480, alignSelf: 'center' },
  tab: { flex: 1, minHeight: 53, justifyContent: 'center', alignItems: 'center', gap: 4, borderRadius: 27 },
  activeTab: { backgroundColor: '#383935' },
  tabText: { color: '#b3b1ab', fontSize: 10 },
  activeTabText: { color: '#fff', fontWeight: '600' },
  pressed: { opacity: 0.75 },
  modalBackdrop: { flex: 1, backgroundColor: '#000b', justifyContent: 'center', padding: 24 },
  modalBody: { backgroundColor: '#242522', borderRadius: 16, padding: 23, alignItems: 'center', alignSelf: 'center', width: '100%', maxWidth: 420 },
  modalTitle: { color: '#fff', fontSize: 23, fontWeight: '700', textAlign: 'center' },
  modalCopy: { color: '#c6c6bf', marginTop: 16, textAlign: 'center' },
});
