import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { supabase } from './supabase';

type BookRow = { id: string; title: string; author: string; genre: string; description: string; published: boolean; premium: boolean; cover_path: string | null; audio_path: string | null };
const empty: Omit<BookRow, 'id'> = { title: '', author: '', genre: '', description: '', published: false, premium: false, cover_path: null, audio_path: null };
export default function AdminScreen({ onClose }: { onClose: () => void }) {
 const [tab,setTab]=useState<'books'|'users'|'stats'>('books');
 const [books,setBooks]=useState<BookRow[]>([]);
 const [editing,setEditing]=useState<string|null>(null);
 const [form,setForm]=useState({...empty});
 const [userId,setUserId]=useState('');
 const [expiry,setExpiry]=useState('');
 const [stats,setStats]=useState({total:0,manual:0,paid:0,events:[] as {book_id:string; users:number; opens:number}[]});
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 async function load(){
   const {data,error}=await supabase.from('books').select('*').order('created_at',{ascending:false});
   if(error)setMessage(error.message);else setBooks((data??[]) as BookRow[]);
   const {data:ents}=await supabase.from('entitlements').select('source,expires_at');
   const active=(ents??[]).filter(x=>!x.expires_at || new Date(x.expires_at)>new Date());
   const {data:ev}=await supabase.from('book_events').select('book_id,user_id,event_type');
   const groups:Record<string,{users:Set<string>;opens:number}>={};
   (ev??[]).forEach(e=>{const g=groups[e.book_id]??={users:new Set<string>(),opens:0};g.users.add(e.user_id);if(e.event_type==='open')g.opens++;});
   setStats({total:active.length,manual:active.filter(x=>x.source==='manual').length,paid:active.filter(x=>x.source==='paid').length,events:Object.entries(groups).map(([book_id,g])=>({book_id,users:g.users.size,opens:g.opens})).sort((a,b)=>b.users-a.users)});
 }
 useEffect(()=>{load();},[]);
 async function upload(kind:'cover'|'audio'){
   try{
     const result=await DocumentPicker.getDocumentAsync({type:kind==='cover'?['image/jpeg','image/png','image/webp']:['audio/mpeg','audio/mp4','audio/x-m4a','audio/aac','audio/wav'],copyToCacheDirectory:true});
     if(result.canceled)return;
     setBusy(true);
     const asset=result.assets[0];
     const ext=(asset.name.split('.').pop()??(kind==='cover'?'jpg':'mp3')).toLowerCase();
     const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
     const fileData=await new File(asset.uri).arrayBuffer();
     const bucket=kind==='cover'?'book-covers':'book-audio';
     const {error}=await supabase.storage.from(bucket).upload(path,fileData,{contentType:asset.mimeType??(kind==='cover'?'image/jpeg':'audio/mpeg')});
     if(error)throw error;
     setForm(p=>({...p,[kind==='cover'?'cover_path':'audio_path']:path}));
     setMessage('Dosya yüklendi. Kitabı kaydederek işlemi tamamla.');
   }catch(e){setMessage(String(e));}finally{setBusy(false);}
 }
 async function save(){
   if(!form.title.trim()){setMessage('Kitap adı zorunlu.');return;}
   setBusy(true);
   const {error}=editing?await supabase.from('books').update({...form,updated_at:new Date().toISOString()}).eq('id',editing):await supabase.from('books').insert(form);
   setBusy(false);
   if(error){setMessage(error.message);return;}
   setEditing(null);setForm({...empty});setMessage('Kitap kaydedildi.');load();
 }
 async function grant(){
   if(!/^[0-9a-f-]{36}$/i.test(userId)){setMessage('Geçerli bir kullanıcı UUID gir.');return;}
   const {error}=await supabase.from('entitlements').upsert({user_id:userId,source:'manual',expires_at:expiry?new Date(expiry).toISOString():null});
   setMessage(error?.message??'Ücretsiz abonelik tanımlandı.');if(!error)load();
 }
 const input=(placeholder:string,key:'title'|'author'|'genre'|'description')=><TextInput placeholder={placeholder} placeholderTextColor="#8b8b84" style={s.input} value={form[key]} onChangeText={v=>setForm(p=>({...p,[key]:v}))}/>;
 const btn=(label:string,onPress:()=>void)=><Pressable onPress={onPress} style={s.button}><Text style={s.buttonText}>{label}</Text></Pressable>;
 return <View style={s.root}><View style={s.header}><Pressable onPress={onClose}><Text style={s.link}>‹ Geri</Text></Pressable><Text style={s.heading}>Yönetim</Text></View>
 <View style={s.tabs}>{(['books','users','stats'] as const).map(t=><Pressable key={t} onPress={()=>setTab(t)} style={[s.tab,tab===t&&s.selected]}><Text style={s.text}>{t==='books'?'Kitaplar':t==='users'?'Abonelikler':'İstatistik'}</Text></Pressable>)}</View>
 <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
 {tab==='books'?<><Text style={s.section}>{editing?'Kitabı düzenle':'Yeni kitap'}</Text>{input('Kitap adı','title')}{input('Yazar','author')}{input('Tür','genre')}{input('Açıklama','description')}
 <View style={s.actions}>{btn(form.cover_path?'Kapağı değiştir':'Kapak yükle',()=>upload('cover'))}{btn(form.audio_path?'Sesi değiştir':'Ses yükle',()=>upload('audio'))}</View>
 <Text style={s.muted}>Kapak: {form.cover_path??'Yüklenmedi'} | Ses: {form.audio_path??'Yüklenmedi'}</Text>
 <View style={s.actions}>{btn(form.published?'Yayında ✓':'Taslak (yayınla)',()=>setForm(p=>({...p,published:!p.published})))}{btn(form.premium?'Premium ✓':'Ücretsiz',()=>setForm(p=>({...p,premium:!p.premium})))}</View>
 {btn(busy?'Bekleyin...':'Kaydet',save)}
 {editing&&btn('Düzenlemeyi iptal et',()=>{setEditing(null);setForm({...empty});})}
 <Text style={s.section}>Katalog · {books.length} kitap</Text>
 {books.map(b=><Pressable key={b.id} style={s.item} onPress={()=>{setEditing(b.id);setForm({title:b.title,author:b.author,genre:b.genre,description:b.description,published:b.published,premium:b.premium,cover_path:b.cover_path,audio_path:b.audio_path});}}><Text style={s.text}>{b.title}</Text><Text style={s.muted}>{b.author} · {b.published?'Yayında':'Taslak'} · {b.premium?'Premium':'Ücretsiz'} · Düzenle ›</Text></Pressable>)}</>:
 tab==='users'?<><Text style={s.section}>Ücretsiz abonelik tanımla</Text><Text style={s.muted}>Bu işlem ücretli ödeme kaydı oluşturmaz. Kullanıcının Supabase Auth UUID bilgisini gir.</Text><TextInput style={s.input} placeholder="Kullanıcı UUID" placeholderTextColor="#888" value={userId} onChangeText={setUserId} autoCapitalize="none"/><TextInput style={s.input} placeholder="Bitiş tarihi (YYYY-MM-DD), boş = süresiz" placeholderTextColor="#888" value={expiry} onChangeText={setExpiry}/>{btn('Abonelik ver',grant)}<Text style={s.section}>Aktif aboneler: {stats.total}</Text><Text style={s.text}>Yönetici hediyesi: {stats.manual}   Ücretli: {stats.paid}</Text></>:
 <><Text style={s.section}>Abonelik özeti</Text><Text style={s.stat}>{stats.total} aktif abone</Text><Text style={s.text}>Ücretli: {stats.paid} · Hediye: {stats.manual}</Text><Text style={s.section}>Kitap etkileşimleri</Text><Text style={s.muted}>Tekil açan kullanıcı ve toplam açılma sayısı. Ses oynatma tamamlanma verisi henüz üretilmiyor.</Text>{stats.events.map(e=><View key={e.book_id} style={s.item}><Text style={s.text}>{books.find(b=>b.id===e.book_id)?.title??e.book_id}</Text><Text style={s.muted}>{e.users} kişi · {e.opens} açılma</Text></View>)}</>}
 {!!message&&<Text style={s.notice}>{message}</Text>}
 </ScrollView></View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#0c0e0c'},header:{padding:22,flexDirection:'row',alignItems:'center',gap:28},heading:{color:'#f3eee5',fontSize:23,fontWeight:'700'},link:{color:'#d8b88b',fontSize:16},tabs:{flexDirection:'row',paddingHorizontal:14,gap:6},tab:{flex:1,paddingVertical:14,alignItems:'center',borderRadius:12,backgroundColor:'#20231f'},selected:{backgroundColor:'#51412e'},body:{padding:20,paddingBottom:90},section:{color:'#f3eee5',fontSize:19,fontWeight:'700',marginTop:20,marginBottom:14},input:{color:'#fff',backgroundColor:'#20231f',padding:14,borderRadius:12,marginBottom:10},button:{backgroundColor:'#b89668',padding:14,borderRadius:12,marginBottom:9,alignItems:'center',flex:1},buttonText:{color:'#171713',fontWeight:'700'},actions:{flexDirection:'row',gap:9},text:{color:'#eee9e1'},muted:{color:'#9b9c94',fontSize:12,marginTop:5},item:{padding:16,borderBottomWidth:1,borderBottomColor:'#33372f'},notice:{color:'#edca98',marginTop:15},stat:{color:'#e4c394',fontSize:33,fontWeight:'700'}});
