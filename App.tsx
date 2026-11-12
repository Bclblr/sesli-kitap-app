import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurTargetView, BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ComponentProps, type ComponentRef } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
type LibraryList = { id: string; name: string; books: string[] };
type LibraryData = { saved: string[]; lists: LibraryList[] };
const libraryKey = 'sesli-kitap:library:v1';
const emptyLibrary: LibraryData = { saved: [], lists: [] };
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

const catalogue = [featured, ...continuing, ...classics];
const genres = [
  { name: 'Polisiye', color: '#253a35', book: featured },
  { name: 'Gotik roman', color: '#422c36', book: classics[0] },
  { name: 'Roman', color: '#49352b', book: continuing[1] },
  { name: 'Bilimkurgu', color: '#263844', book: continuing[2] },
  { name: 'Destan', color: '#483c2c', book: classics[1] },
  { name: 'Fantastik', color: '#383449', book: classics[3] },
];

function searchKey(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i');
}

function SearchScreen({ bottomPadding, onOpen }: { bottomPadding: number; onOpen: (book: Book) => void }) {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<string | null>(null);
  const terms = searchKey(query.trim()).split(/\s+/).filter(Boolean);
  const isBrowsing = terms.length === 0 && genre === null;
  const results = isBrowsing ? [featured, classics[0], continuing[2]] : catalogue.filter((book) => {
    const searchable = searchKey(book.title + ' ' + book.author);
    return (!genre || book.genre === genre) && terms.every((term) => searchable.includes(term));
  });

  return (
    <View style={styles.searchScreen}>
      <View style={styles.searchField}>
        <Feather name="search" color="#b7b5af" size={21} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Kitap veya yazar ara"
          placeholderTextColor="#aaa8a0"
          accessibilityLabel="Kitap veya yazar ara"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardAppearance="dark"
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Aramayı temizle" onPress={() => setQuery('')} style={styles.clearSearch}>
            <Feather name="x" color="#fff" size={20} />
          </Pressable>
        )}
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.searchContent, { paddingBottom: bottomPadding }]}
      >
        {isBrowsing && (
          <>
            <Text accessibilityRole="header" style={styles.searchHeading}>Türlere Göz At</Text>
            <View style={styles.genreGrid}>
              {genres.map((item) => (
                <Pressable
                  key={item.name}
                  accessibilityRole="button"
                  onPress={() => setGenre(item.name)}
                  style={({ pressed }) => [styles.genreCard, { backgroundColor: item.color }, pressed && styles.pressed]}
                >
                  <Text style={styles.genreTitle}>{item.name}</Text>
                  <View style={styles.genreCover} accessible={false} pointerEvents="none">
                    <BookCover book={item.book} />
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
        <View style={styles.resultsHeader}>
          <Text accessibilityRole="header" style={styles.searchHeading}>
            {genre ?? (isBrowsing ? 'Önerilen Kitaplar' : 'Arama Sonuçları')}
          </Text>
          {genre && (
            <Pressable accessibilityRole="button" accessibilityLabel="Tür filtresini kaldır" onPress={() => setGenre(null)} style={styles.clearGenre}>
              <Text style={styles.clearGenreText}>Tüm türler</Text>
            </Pressable>
          )}
        </View>
        {results.length === 0 && (
          <Text accessibilityLiveRegion="polite" style={styles.noResults}>Aramana uygun kitap bulunamadı.</Text>
        )}
        {results.map((book) => (
          <Pressable
            key={book.id}
            accessibilityRole="button"
            accessibilityLabel={book.title + ', ' + book.author}
            onPress={() => onOpen(book)}
            style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}
          >
            <View style={[styles.resultCover, { backgroundColor: book.paper }]}>
              <Text style={[styles.resultMark, { color: book.ink }]}>{book.mark}</Text>
            </View>
            <View style={styles.resultInfo}>
              <Text style={styles.resultTitle}>{book.title}</Text>
              <Text style={styles.resultAuthor}>{book.author}</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#aaa8a0" />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const librarySections: { id: string; title: string; icon: IconName; color: string; empty: string }[] = [
  { id: 'saved', title: 'Sonra Dinle', icon: 'bookmark', color: '#2c3c33', empty: 'Bir kitabın ayrıntılarından Sonra Dinle’ye ekleyebilirsin.' },
  { id: 'history', title: 'Dinlediklerim', icon: 'clock', color: '#44342a', empty: 'Dinleme geçmişin burada görünecek.' },
  { id: 'downloads', title: 'İndirdiklerim', icon: 'download', color: '#2b3642', empty: 'İndirilen kitaplar burada görünecek.' },
];

function LibraryScreen({ data, bottomPadding, onCreate, onOpen }: {
  data: LibraryData;
  bottomPadding: number;
  onCreate: (name: string) => void;
  onOpen: (book: Book) => void;
}) {
  const [collection, setCollection] = useState<string | null>(null);
  const [grid, setGrid] = useState(false);
  const [newestFirst, setNewestFirst] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const section = librarySections.find((item) => item.id === collection);
  const list = data.lists.find((item) => item.id === collection);
  const bookIds = collection === 'saved' ? data.saved : list?.books ?? [];
  const books = catalogue.filter((book) => bookIds.includes(book.id));
  const lists = newestFirst ? [...data.lists].reverse() : data.lists;

  function createList() {
    if (!name.trim()) return;
    onCreate(name.trim());
    setName('');
    setCreating(false);
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.libraryContent, { paddingBottom: bottomPadding }]}
    >
      {collection ? (
        <>
          <Pressable accessibilityRole="button" onPress={() => setCollection(null)} style={styles.libraryBack}>
            <Feather name="arrow-left" size={19} color={accent} />
            <Text style={styles.libraryAction}>Kitaplığım</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.searchHeading}>{section?.title ?? list?.name}</Text>
          {books.length === 0 && <Text style={styles.noResults}>{section?.empty ?? 'Kitap ayrıntılarından bu listeye kitap ekleyebilirsin.'}</Text>}
          {books.map((book) => (
            <Pressable key={book.id} accessibilityRole="button" onPress={() => onOpen(book)} style={styles.resultRow}>
              <View style={[styles.resultCover, { backgroundColor: book.paper }]}>
                <Text style={[styles.resultMark, { color: book.ink }]}>{book.mark}</Text>
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle}>{book.title}</Text>
                <Text style={styles.resultAuthor}>{book.author}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#aaa8a0" />
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <View style={styles.libraryGrid}>
            {librarySections.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => setCollection(item.id)}
                style={({ pressed }) => [styles.libraryCard, item.id === 'downloads' && styles.wideLibraryCard, { backgroundColor: item.color }, pressed && styles.pressed]}
              >
                <Feather name={item.icon} size={22} color="#eee8db" />
                <View style={styles.libraryCardCopy}>
                  <Text style={styles.libraryCardTitle}>{item.title}</Text>
                  <Text style={styles.libraryCount}>{item.id === 'saved' ? data.saved.length : 0} kitap</Text>
                </View>
              </Pressable>
            ))}
          </View>
          <View style={styles.libraryDivider} />
          <Text accessibilityRole="header" style={styles.searchHeading}>Listeler</Text>
          <View style={styles.listControls}>
            <View style={styles.layoutControls}>
              {(['list', 'grid'] as const).map((mode) => {
                const active = grid === (mode === 'grid');
                return (
                  <Pressable
                    key={mode}
                    accessibilityRole="button"
                    accessibilityLabel={mode === 'list' ? 'Liste görünümü' : 'Izgara görünümü'}
                    accessibilityState={{ selected: active }}
                    onPress={() => setGrid(mode === 'grid')}
                    style={[styles.layoutButton, active && styles.layoutActive]}
                  >
                    <Feather name={mode} size={20} color={active ? accent : '#aaa8a0'} />
                  </Pressable>
                );
              })}
            </View>
            <Pressable accessibilityRole="button" accessibilityHint="Sıralama yönünü değiştirir" onPress={() => setNewestFirst(!newestFirst)} style={styles.sortButton}>
              <Text style={styles.libraryCount}>{newestFirst ? 'Yeniden eskiye' : 'Eskiden yeniye'}</Text>
              <Feather name={newestFirst ? 'arrow-down' : 'arrow-up'} size={16} color={accent} />
            </Pressable>
          </View>
          {creating ? (
            <View style={styles.newListForm}>
              <TextInput
                autoFocus
                value={name}
                onChangeText={setName}
                onSubmitEditing={createList}
                accessibilityLabel="Liste adı"
                placeholder="Liste adı"
                placeholderTextColor="#aaa8a0"
                keyboardAppearance="dark"
                returnKeyType="done"
                maxLength={60}
                style={styles.newListInput}
              />
              <Pressable accessibilityRole="button" accessibilityLabel="Listeyi kaydet" disabled={!name.trim()} onPress={createList} style={[styles.layoutButton, !name.trim() && styles.pressed]}>
                <Feather name="check" size={21} color={accent} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Vazgeç" onPress={() => { setCreating(false); setName(''); }} style={styles.layoutButton}>
                <Feather name="x" size={20} color="#aaa8a0" />
              </Pressable>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setCreating(true)} style={styles.newListButton}>
              <View style={styles.newListIcon}><Feather name="plus" size={22} color={accent} /></View>
              <Text style={styles.resultTitle}>Yeni Liste Oluştur</Text>
            </Pressable>
          )}
          <View style={grid ? styles.libraryGrid : undefined}>
            {lists.map((item) => (
              <Pressable key={item.id} accessibilityRole="button" onPress={() => setCollection(item.id)} style={grid ? [styles.libraryCard, styles.listGridCard] : styles.resultRow}>
                <Feather name="list" size={20} color={accent} />
                <View style={styles.libraryCardCopy}>
                  <Text style={styles.resultTitle} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.libraryCount}>{item.books.length} kitap</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function BarBackground({ target, bottom = false }: { target: NonNullable<ComponentProps<typeof BlurView>["blurTarget"]>; bottom?: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <BlurView
        blurTarget={target}
        blurMethod="dimezisBlurViewSdk31Plus"
        intensity={bottom ? 55 : 43}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, bottom ? styles.navShade : styles.headerShade]} />
    </View>
  );
}

function Home() {
  const insets = useSafeAreaInsets();
  const backdrop = useRef<ComponentRef<typeof BlurTargetView>>(null);
  const [selected, setSelected] = useState<Book | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<Exclude<Tab, 'profile'>>('home');
  const [library, setLibrary] = useState<LibraryData | null>(null);
  const [libraryError, setLibraryError] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(libraryKey)
      .then((value) => setLibrary(value ? JSON.parse(value) as LibraryData : emptyLibrary))
      .catch(() => { setLibrary(emptyLibrary); setLibraryError(true); });
  }, []);

  useEffect(() => {
    if (library === null || libraryError) return;
    AsyncStorage.setItem(libraryKey, JSON.stringify(library)).catch(() => setLibraryError(true));
  }, [library, libraryError]);

  function toggleSaved(id: string) {
    setLibrary((current) => current && {
      ...current,
      saved: current.saved.includes(id) ? current.saved.filter((bookId) => bookId !== id) : [...current.saved, id],
    });
  }

  function createList(name: string) {
    const id = Date.now().toString(36);
    setLibrary((current) => current && { ...current, lists: [...current.lists, { id, name, books: [] }] });
  }

  function toggleListBook(listId: string, bookId: string) {
    setLibrary((current) => current && {
      ...current,
      lists: current.lists.map((list) => list.id !== listId ? list : {
        ...list,
        books: list.books.includes(bookId) ? list.books.filter((id) => id !== bookId) : [...list.books, bookId],
      }),
    });
  }

  function openTab(tab: Tab) {
    if (tab !== 'profile') {
      setActiveTab(tab);
      return;
    }
    setShowProfile(true);
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <BlurTargetView ref={backdrop} style={styles.backdrop}>
        {activeTab === 'library' ? (
          <View style={[styles.searchScreen, { paddingTop: insets.top + 58 }]}>
            {libraryError && <Text style={styles.libraryWarning}>Kitaplık değişiklikleri bu oturumda cihaza kaydedilemiyor.</Text>}
            {library && <LibraryScreen data={library} bottomPadding={94 + insets.bottom} onCreate={createList} onOpen={setSelected} />}
          </View>
        ) : activeTab === 'search' ? (
          <View style={[styles.searchScreen, { paddingTop: insets.top + 58 }]}>
            <SearchScreen bottomPadding={94 + insets.bottom} onOpen={setSelected} />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
            <View style={[styles.hero, { paddingTop: insets.top + 58 }]}>
              <LinearGradient
                colors={['#34483f', '#24342d', '#111714', '#000000']}
                locations={[0, 0.39, 0.73, 1]}
                style={StyleSheet.absoluteFill}
              />
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
        )}
      </BlurTargetView>
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <BarBackground target={backdrop} />
        <View style={styles.header}>
          {activeTab === 'home' && <Ionicons name="headset-outline" size={25} color={accent} />}
          <Text accessibilityRole="header" style={styles.brand}>{activeTab === 'home' ? 'Sesli Kitap' : tabs.find((tab) => tab.id === activeTab)?.label}</Text>
        </View>
      </View>
      <View style={[styles.nav, { bottom: Math.max(insets.bottom, 12) }]}>
        <BarBackground target={backdrop} bottom />
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab.id === activeTab }}
            onPress={() => openTab(tab.id)}
            style={({ pressed }) => [styles.tab, tab.id === activeTab && styles.activeTab, pressed && styles.pressed]}
          >
            <Feather name={tab.icon} size={21} color={tab.id === activeTab ? '#fff' : '#b3b1ab'} />
            <Text style={[styles.tabText, tab.id === activeTab && styles.activeTabText]} numberOfLines={1}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
      <Modal
        visible={selected !== null || showProfile}
        transparent
        animationType="fade"
        onRequestClose={() => { setSelected(null); setShowProfile(false); }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBody} accessibilityViewIsModal>
            <Text style={styles.modalTitle} accessibilityRole="header">
              {selected?.title ?? 'Profil'}
            </Text>
            {selected && <Text style={styles.featureMeta}>{selected.author} · {selected.genre}</Text>}
            <Text style={styles.modalCopy}>
              {selected ? 'Ses kaydı henüz eklenmedi.' : 'Bu bölüm henüz hazır değil.'}
            </Text>
            {selected && library && (
              <>
                <Pressable accessibilityRole="button" onPress={() => toggleSaved(selected.id)} style={styles.libraryBack}>
                  <Feather name="bookmark" size={18} color={accent} />
                  <Text style={styles.libraryAction}>{library.saved.includes(selected.id) ? 'Sonra Dinle’den Kaldır' : 'Sonra Dinle’ye Ekle'}</Text>
                </Pressable>
                {library.lists.length > 0 && (
                  <ScrollView style={styles.modalLists} keyboardShouldPersistTaps="handled">
                    {library.lists.map((list) => {
                      const included = list.books.includes(selected.id);
                      return (
                        <Pressable key={list.id} accessibilityRole="checkbox" accessibilityState={{ checked: included }} onPress={() => toggleListBook(list.id, selected.id)} style={styles.libraryBack}>
                          <Feather name={included ? 'check-square' : 'square'} size={17} color={accent} />
                          <Text style={styles.libraryAction}>{list.name}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => { setSelected(null); setShowProfile(false); }}
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
  backdrop: { flex: 1 },
  libraryContent: { paddingHorizontal: 20, paddingTop: 12 },
  libraryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  libraryCard: { width: '48.5%', minHeight: 103, borderRadius: 9, padding: 13, gap: 10, justifyContent: 'space-between' },
  wideLibraryCard: { width: '100%', flexDirection: 'row', alignItems: 'center', minHeight: 68, justifyContent: 'flex-start' },
  libraryCardCopy: { gap: 4, flexShrink: 1 },
  libraryCardTitle: { color: '#f7f6f3', fontSize: 16, fontWeight: '700' },
  libraryCount: { color: '#d4cec1', fontSize: 12 },
  libraryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#3a3731', marginTop: 24, marginBottom: 17 },
  listControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, marginBottom: 7 },
  layoutControls: { flexDirection: 'row', gap: 4 },
  layoutButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  layoutActive: { borderBottomWidth: 2, borderBottomColor: '#dfb578' },
  sortButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
  newListButton: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, marginBottom: 8 },
  newListIcon: { width: 46, height: 46, borderRadius: 7, backgroundColor: '#302820', alignItems: 'center', justifyContent: 'center' },
  newListForm: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: '#242522', borderRadius: 8 },
  newListInput: { flex: 1, minHeight: 48, paddingHorizontal: 12, color: '#f7f6f3', fontSize: 15 },
  listGridCard: { minHeight: 88, backgroundColor: '#242522' },
  libraryBack: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  libraryAction: { color: '#dfb578', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  libraryWarning: { color: '#dfb578', paddingHorizontal: 20, paddingVertical: 8 },
  modalLists: { alignSelf: 'stretch', maxHeight: 132 },
  searchScreen: { flex: 1, backgroundColor: '#000' },
  searchField: { marginHorizontal: 20, marginTop: 4, marginBottom: 10, paddingLeft: 14, paddingRight: 6, minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, backgroundColor: '#242522' },
  searchInput: { flex: 1, paddingVertical: 12, paddingRight: 6, color: '#f7f6f3', fontSize: 16 },
  clearSearch: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  searchContent: { paddingHorizontal: 20, paddingTop: 10 },
  searchHeading: { color: '#f7f6f3', fontSize: 21, fontWeight: '700', letterSpacing: -0.45 },
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 12, marginBottom: 24 },
  genreCard: { width: '48.5%', minHeight: 90, borderRadius: 8, overflow: 'hidden', padding: 11, justifyContent: 'center' },
  genreTitle: { color: '#fff', width: '64%', fontSize: 15, fontWeight: '700', zIndex: 1 },
  genreCover: { position: 'absolute', right: -7, bottom: -20, width: 66, height: 92, borderRadius: 3, overflow: 'hidden', transform: [{ rotate: '13deg' }] },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 7 },
  clearGenre: { minHeight: 44, justifyContent: 'center' },
  clearGenreText: { color: '#dfb578', fontSize: 13, fontWeight: '600' },
  noResults: { color: '#aaa8a0', marginTop: 10, lineHeight: 22, fontSize: 15 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 74, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#30302c' },
  resultCover: { width: 45, height: 60, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  resultMark: { fontFamily: serif, fontSize: 22 },
  resultInfo: { flex: 1, gap: 4 },
  resultTitle: { color: '#f7f6f3', fontSize: 15, fontWeight: '600' },
  resultAuthor: { color: '#aaa8a0', fontSize: 13 },
  hero: { paddingBottom: 30 },
  headerBar: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  headerShade: { backgroundColor: 'rgba(15, 16, 15, 0.30)' },
  navShade: { backgroundColor: 'rgba(25, 25, 24, 0.48)' },
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
  nav: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#50504a', borderRadius: 32, padding: 5, maxWidth: 480, alignSelf: 'center' },
  tab: { flex: 1, minHeight: 53, justifyContent: 'center', alignItems: 'center', gap: 4, borderRadius: 27 },
  activeTab: { backgroundColor: 'rgba(255, 255, 255, 0.09)' },
  tabText: { color: '#b3b1ab', fontSize: 10 },
  activeTabText: { color: '#fff', fontWeight: '600' },
  pressed: { opacity: 0.75 },
  modalBackdrop: { flex: 1, backgroundColor: '#000b', justifyContent: 'center', padding: 24 },
  modalBody: { backgroundColor: '#242522', borderRadius: 16, padding: 23, alignItems: 'center', alignSelf: 'center', width: '100%', maxWidth: 420 },
  modalTitle: { color: '#fff', fontSize: 23, fontWeight: '700', textAlign: 'center' },
  modalCopy: { color: '#c6c6bf', marginTop: 16, textAlign: 'center' },
});
