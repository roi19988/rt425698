import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { demoResult } from './src/demo';
import { identify, identifyUrl } from './src/identify';
import { Identification, Photo } from './src/types';
import SearchAttribution from './src/SearchAttribution';
import Ionicons from '@expo/vector-icons/Ionicons';
import { IMAGE_IDENTIFICATION_WARNING, safetyStatusText } from './src/safetyPresentation.cjs';

const confidence = { high: 'גבוהה', moderate: 'בינונית', low: 'נמוכה' };
const tabs = ['היכרות', 'אכילות ורעילות', 'שימושים'] as const;

function Button({ children, onPress, secondary = false, disabled = false }: { children: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, (disabled || pressed) && { opacity: 0.55 }]}><Text style={[s.buttonText, secondary && { color: '#23583f' }]}>{children}</Text></Pressable>;
}

function SafetyStatus({ verified, compact = false }: { verified: boolean; compact?: boolean }) {
  const text = safetyStatusText(verified);
  return <View accessible accessibilityRole="text" accessibilityLabel={`מצב אימות בטיחות: ${text}`} style={[s.safetyStatus, verified && s.safetyStatusVerified]}>
    <Ionicons name={verified ? 'checkmark-circle-outline' : 'warning-outline'} size={18} color={verified ? '#315F46' : '#806127'} />
    <Text style={[s.safetyStatusText, compact && s.safetyStatusTextCompact]}>{text}</Text>
  </View>;
}

export default function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [screen, setScreen] = useState<'home' | 'scanner' | 'result' | 'details'>('home');
  const [expanded, setExpanded] = useState('אכילות');
  const [saved, setSaved] = useState(false);
  const [recent, setRecent] = useState<{ result: Identification; uri: string; photos: Photo[]; saved: boolean }[]>([]);
  const [result, setResult] = useState<Identification | null>(null);
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<(typeof tabs)[number]>('היכרות');
  const [consent, setConsent] = useState(false);
  const [photosChanged, setPhotosChanged] = useState(false);
  const pickerLock = useRef(false);
  const scroll = useRef<ScrollView>(null);

  async function pick(camera: boolean) {
    if (pickerLock.current || busy || photos.length >= 5) return;
    pickerLock.current = true;
    setError('');
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { setError('כדי לצלם יש לאפשר גישה למצלמה בהגדרות הטלפון. אפשר גם לבחור תמונה מהגלריה.'); return; }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], base64: true, quality: 0.6, allowsEditing: false, exif: false };
      const selection = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (selection.canceled) return;
      const asset = selection.assets[0];
      if (!asset.base64) throw new Error('לא ניתן לקרוא את התמונה. נסו תמונה אחרת.');
      if (asset.base64.length > 6000000) throw new Error('התמונה גדולה מדי. בחרו תמונה קטנה יותר.');
      const mimeType = asset.base64.startsWith('/9j/') ? 'image/jpeg' : asset.base64.startsWith('iVBORw0KGgo') ? 'image/png' : null;
      if (!mimeType) throw new Error('שירות הזיהוי תומך בתמונות JPEG או PNG. בחרו קובץ באחד מהפורמטים האלה.');
      setPhotos(current => [...current, { uri: asset.uri, base64: asset.base64!, mimeType }]);
      setPhotosChanged(true);
      // Keep the prior result as evidence when adding a view of the same specimen.
      setConsent(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'לא ניתן לפתוח את המצלמה או הגלריה.'); }
    finally { pickerLock.current = false; }
  }

  async function run() {
    if (busy || !photos.length || !consent) return;
    setBusy(true); setError('');
    try {
      const next = await identify(photos, demo ? null : result);
      setResult(next); setDemo(false); setTab('היכרות');
      setPhotosChanged(false);
      setScreen('result');
      setSaved(false);
      setRecent(current => [{ result: next, uri: photos[0].uri, photos, saved: false }, ...current].slice(0, 8));
      scroll.current?.scrollTo({ y: 0, animated: true });
    } catch (e) { setError(e instanceof Error ? e.message : 'לא ניתן להתחבר לשירות הזיהוי. בדקו את החיבור ונסו שוב.'); }
    finally { setBusy(false); }
  }

  function reset() { setPhotos([]); setResult(null); setDemo(false); setError(''); setConsent(false); setPhotosChanged(false); setTab('היכרות'); }

  const hero = require('./assets/olive-editorial.png');
  const image = photos[0] ? { uri: photos[0].uri } : hero;
  const fields = result ? [
    { name: 'אכילות', icon: 'restaurant-outline' as const, text: result.edibility, safety: true },
    { name: 'רעילות', icon: 'shield-checkmark-outline' as const, text: result.toxicity, safety: true },
    { name: 'שימושים מסורתיים', icon: 'book-outline' as const, text: result.traditionalUses, safety: false },
    { name: 'עובדות מעניינות', icon: 'sparkles-outline' as const, text: result.facts.join('\n\n'), safety: false },
    { name: 'בית גידול ואקולוגיה', icon: 'leaf-outline' as const, text: result.otherUses, safety: false },
  ] : [];
  function navigate(next: typeof screen) { setScreen(next); scroll.current?.scrollTo({ y: 0, animated: false }); }
  function saveCurrent() {
    if (!result || demo) return;
    const value = !saved; setSaved(value);
    setRecent(items => items.map(item => item.result === result ? { ...item, saved: value } : item));
  }
  const icon = (name: React.ComponentProps<typeof Ionicons>['name'], color = '#193D32', size = 22) => <Ionicons name={name} size={size} color={color} />;
  return <SafeAreaView style={s.safe}>
    <StatusBar style={screen === 'scanner' ? 'light' : 'dark'} />
    <View style={s.shell}>
      <View style={s.header}>
        <Pressable accessibilityLabel="חזרה לבית" onPress={() => navigate('home')} style={s.brandRow}>{icon('leaf-outline')}<Text style={s.brand}>מבט לטבע</Text></Pressable>
        <Pressable accessibilityLabel={screen === 'home' ? 'פתיחת האוסף' : 'חזרה'} onPress={() => screen === 'home' ? setTab('שימושים') : navigate(screen === 'details' ? 'result' : 'home')}>{icon(screen === 'home' ? 'bookmark-outline' : 'arrow-forward')}</Pressable>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={s.page}>
        {screen === 'home' && <>
          <Text style={s.eyebrow}>מבט מקרוב על עולם הטבע</Text>
          <Text style={s.title}>לגלות את הטבע{'\n'}שמסביבך.</Text>
          <Text style={s.subtitle}>לכל עלה יש סיפור. בואו לגלות אותו.</Text>
          <View style={s.hero}>
            <Image source={hero} style={s.heroPhoto} />
            <View style={s.heroCaption}><Text style={s.heroLabel}>הסקרנות צומחת כאן</Text><Text style={s.heroTitle}>פרטים קטנים.{'\n'}טבע מופלא.</Text></View>
            <Text style={s.imageCredit}>תמונה בוטנית להמחשה</Text>
          </View>
          <Button onPress={() => { reset(); navigate('scanner'); }}>זיהוי צמח</Button>
          <View style={s.sectionRow}><Text style={s.sectionTitle}>{tab === 'שימושים' ? 'האוסף שלי' : 'גילויים אחרונים'}</Text><Pressable onPress={() => setTab(tab === 'שימושים' ? 'היכרות' : 'שימושים')}><Text style={s.link}>{tab === 'שימושים' ? 'לגילויים האחרונים' : 'לאוסף שלי'} →</Text></Pressable></View>
          {recent.filter(item => tab !== 'שימושים' || item.saved).length === 0 ? <View style={s.empty}><View style={s.iconCircle}>{icon('leaf-outline')}</View><Text style={s.sectionTitle}>האוסף שלך מתחיל כאן</Text><Text style={s.subtitle}>זהו צמח והוסיפו גילוי חדש. האוסף נשמר במהלך ההפעלה בלבד.</Text></View> : recent.filter(item => tab !== 'שימושים' || item.saved).map((item, index) => <Pressable key={index} style={s.discovery} onPress={() => { setResult(item.result); setPhotos(item.photos); setSaved(item.saved); setDemo(false); setPhotosChanged(false); navigate('result'); }}><Image source={{ uri: item.uri }} style={s.thumbnail}/><View style={{flex:1}}><Text style={s.sectionTitle}>{item.result.commonName}</Text><Text style={s.scientific}>{item.result.scientificName}</Text></View>{icon('chevron-back')}</Pressable>)}
          <Pressable style={s.previewLink} onPress={() => { setResult(demoResult); setPhotos([]); setDemo(true); navigate('result'); }}><Text style={s.link}>הצצה לתוצאה לדוגמה ←</Text></Pressable>
        </>}
        {screen === 'scanner' && <>
          <View style={s.scanner}>
            <Image source={image} style={StyleSheet.absoluteFillObject} />
            <View style={s.cameraTop}><Text style={s.cameraText}>{photos.length ? 'התמונות שלך' : 'מוכנים לגלות'}</Text><Text style={s.cameraHint}>{photos.length ? 'התמונה שבחרת' : 'לחיצה על כפתור הצילום תפתח את המצלמה'}</Text></View>
            <View style={s.scanFrame} />
            <View style={s.cameraBottom}><Text style={s.cameraHint}>צלמו עלה, פרח או את הצמח כולו</Text><View style={s.cameraControls}><Pressable accessibilityLabel="בחירה מהגלריה" disabled={busy || photos.length >= 5} onPress={() => pick(false)}>{icon('images-outline', '#fff', 27)}</Pressable><Pressable accessibilityLabel="צילום תמונה" disabled={busy || photos.length >= 5} onPress={() => pick(true)} style={s.shutter}><View style={s.shutterInner}/></Pressable><Text style={s.cameraText}>{photos.length}/5</Text></View></View>
            {!photos.length && <Text style={s.previewBadge}>תמונה להמחשה · המצלמה עדיין אינה פעילה</Text>}
          </View>
          <Text style={s.subtitle}>צלמו באור טבעי. לזיהוי מדויק יותר, הוסיפו כמה זוויות של אותו הצמח.</Text>
          {photos.length > 0 && <View style={s.card}><ScrollView horizontal contentContainerStyle={s.photoRow}>{photos.map((photo,index) => <View key={index}><Image source={{uri:photo.uri}} style={s.photo}/><Pressable disabled={busy} accessibilityLabel={'הסרת תמונה ' + (index+1)} onPress={() => {setPhotos(items => items.filter((_,i) => i !== index));setConsent(false);setPhotosChanged(true);}}><Text style={s.remove}>הסרה</Text></Pressable></View>)}</ScrollView>
          <Pressable accessibilityRole="checkbox" accessibilityState={{checked:consent}} disabled={busy} onPress={() => setConsent(!consent)} style={s.consent}>{icon(consent ? 'checkbox' : 'square-outline')}<Text style={[s.subtitle,{flex:1}]}>אני מסכימ/ה לשליחת התמונות ל־Pl@ntNet ול־Google Gemini לצורך זיהוי והסבר.</Text></Pressable>
          <Button disabled={!consent || busy || !identifyUrl} onPress={run}>{busy ? 'מזהים את הצמח…' : 'זיהוי הצמח'}</Button></View>}
        </>}
        {(screen === 'result' || screen === 'details') && result && <>
          {demo && <View style={s.banner}><Text style={s.note}>תוצאה לדוגמה · זוהי הדגמה בדיונית של הממשק, ולא זיהוי של צמח.</Text></View>}
          <Image source={image} style={screen === 'details' ? s.detailPhoto : s.resultPhoto}/>
          <View style={s.sectionRow}><Text style={s.eyebrow}>{screen === 'details' ? 'מבט מעמיק' : 'הגילוי שלך'}</Text>{!demo && <Pressable accessibilityLabel={saved ? 'הסרה מהאוסף' : 'שמירה באוסף'} onPress={saveCurrent}>{icon(saved ? 'bookmark' : 'bookmark-outline')}</Pressable>}</View>
          <Text style={s.resultName}>{result.commonName}</Text>
          <Text style={s.scientific}>{result.scientificName}</Text>
          <View style={s.meta}><Text style={s.pill}>ודאות הזיהוי: {confidence[result.confidence]}</Text><Text style={s.subtitle}>{result.family}</Text></View>
          <View accessible accessibilityRole="alert" accessibilityLabel={IMAGE_IDENTIFICATION_WARNING} style={s.warning}><View style={s.sectionRow}>{icon('warning-outline','#8B641E',20)}<Text style={s.warningTitle}>אזהרת בטיחות</Text></View><Text style={s.warningBody}>{IMAGE_IDENTIFICATION_WARNING} אין לאכול, לטעום או לתת לבעלי חיים צמח על סמך זיהוי מתמונה בלבד.</Text></View>
          {!!result.explanationNotice && <Text style={s.hebrew}>{result.explanationNotice}</Text>}
          {photosChanged && <Text style={s.note}>התמונות השתנו. יש לעדכן את הזיהוי כדי לבדוק את המידע החדש.</Text>}
          {screen === 'result' ? <>
            {fields.slice(0,4).map(field => <Pressable key={field.name} accessibilityLabel={`${field.name}. ${field.safety ? safetyStatusText(result.safetyVerified) : ''} פתיחת פרטים`} style={s.infoCard} onPress={() => {setExpanded(field.name);navigate('details');}}><View style={s.infoIcon}>{icon(field.icon)}</View><View style={{flex:1}}><Text style={s.sectionTitle}>{field.name}</Text>{field.safety && <SafetyStatus verified={result.safetyVerified} compact />}<Text numberOfLines={2} style={s.hebrew}>{field.text}</Text></View>{icon('chevron-back','#87958B',18)}</Pressable>)}
            <Button secondary onPress={() => navigate('details')}>לפרטים המלאים ←</Button>
            {!demo && <Button secondary onPress={() => navigate('scanner')}>הוספת תמונה נוספת</Button>}
          </> : <>
            <Text style={s.sectionTitle}>להכיר את הצמח לעומק</Text>
            {[{name:'מאפייני הזיהוי',icon:'scan-outline' as const,text:result.clues.join('\n\n'),safety:false},...fields,{name:'מינים דומים',icon:'git-branch-outline' as const,text:result.alternatives.join('\n') || 'לא הוחזרו אפשרויות נוספות.',safety:false}].map(field => <View key={field.name} style={s.accordion}><Pressable accessibilityRole="button" accessibilityState={{expanded:expanded===field.name}} accessibilityLabel={`${field.name}${field.safety ? `. מצב אימות בטיחות: ${safetyStatusText(result.safetyVerified)}` : ''}`} style={s.sectionRow} onPress={() => setExpanded(expanded===field.name ? '' : field.name)}><View style={s.brandRow}>{icon(field.icon, '#193D32',20)}<Text style={s.sectionTitle}>{field.name}</Text></View>{icon(expanded===field.name ? 'remove' : 'add', '#193D32',20)}</Pressable>{expanded===field.name && <View>{field.safety && <SafetyStatus verified={result.safetyVerified} />}<Text style={s.hebrew}>{field.text}</Text>{field.safety && <Text style={s.note}>ודאות הזיהוי ומצב אימות הבטיחות הם מדדים נפרדים. גם זיהוי בוודאות גבוהה אינו מעיד שהפרט בטוח.</Text>}</View>}</View>)}
            <Text style={s.note}>שימושים רפואיים מסורתיים מתארים היסטוריה ותרבות ואינם המלצה לטיפול.</Text>
            {result.additionalPhoto && <View style={s.card}><Text style={s.sectionTitle}>תמונה נוספת יכולה לעזור</Text><Text style={s.hebrew}>{result.additionalPhoto}</Text></View>}
            {result.sources.length > 0 && <View style={s.card}><Text style={s.sectionTitle}>מקורות וקריאה נוספת</Text>{result.sources.map((source,index) => <Pressable key={index} accessibilityRole="link" onPress={() => Linking.openURL(source.url).catch(() => setError('לא ניתן לפתוח את המקור.'))}><Text style={s.link}>{source.title} ↗</Text></Pressable>)}</View>}
            {result.searchEntryPoint && <SearchAttribution html={result.searchEntryPoint}/>}
          </>}
        </>}
        {busy && <ActivityIndicator color="#193D32"/>}
        {!!error && <View accessibilityRole="alert" style={s.warning}><Text style={s.hebrew}>{error}</Text></View>}
        <Text style={s.footer}>לגלות, להתבונן, להכיר.{'\n'}זיהוי הצמחים מבוסס על Pl@ntNet</Text>
      </ScrollView>
      <View style={s.nav}>{([{name:'בית',target:'home',icon:'home-outline'},{name:'זיהוי',target:'scanner',icon:'scan-outline'},{name:'האוסף שלי',target:'home',icon:'bookmark-outline'}] as const).map(item => <Pressable key={item.name} accessibilityRole="button" onPress={() => { if(item.name==='האוסף שלי') setTab('שימושים'); else setTab('היכרות'); navigate(item.target); }} style={s.navItem}>{icon(item.icon,screen===item.target ? '#193D32' : '#8B958C',22)}<Text style={s.navLabel}>{item.name}</Text></Pressable>)}</View>
    </View>
  </SafeAreaView>;
}

const serif = Platform.OS === 'android' ? 'serif' : Platform.OS === 'web' ? 'Noto Serif Hebrew, David, serif' : 'Georgia';
const s = StyleSheet.create({
 safe:{flex:1,backgroundColor:'#F8F7F2',paddingTop:Platform.OS==='android'?32:0},
 shell:{flex:1,maxWidth:480,width:'100%',alignSelf:'center',backgroundColor:'#F8F7F2'},
 header:{paddingHorizontal:24,paddingVertical:22,flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:'#E7E8DF'},
 brandRow:{flexDirection:'row-reverse',gap:10,alignItems:'center'},brand:{textAlign:'right',writingDirection:'rtl',fontSize:18,fontWeight:'600',color:'#193D32'},
 page:{padding:24,gap:16,paddingBottom:30},eyebrow:{textAlign:'right',writingDirection:'rtl',fontSize:9,fontWeight:'600',letterSpacing:0,color:'#6D8073'},
 title:{textAlign:'right',writingDirection:'rtl',fontFamily:serif,fontSize:37,lineHeight:45,color:'#193D32',marginTop:3},subtitle:{textAlign:'right',writingDirection:'rtl',fontSize:13,lineHeight:21,color:'#758176'},
 hero:{height:300,borderRadius:20,overflow:'hidden',marginTop:8},heroPhoto:{width:'100%',height:'100%'},heroCaption:{position:'absolute',top:24,right:24},heroLabel:{textAlign:'right',writingDirection:'rtl',fontSize:9,letterSpacing:0,color:'#F8F7F2'},heroTitle:{textAlign:'right',writingDirection:'rtl',fontFamily:serif,fontSize:27,lineHeight:34,color:'#fff',marginTop:12},imageCredit:{position:'absolute',bottom:12,right:16,color:'#fff',fontSize:9},
 button:{backgroundColor:'#193D32',borderRadius:14,paddingVertical:17,paddingHorizontal:20,alignItems:'center',flexGrow:1},buttonText:{color:'#fff',fontWeight:'600',fontSize:14},secondary:{backgroundColor:'#E8EDE5',borderWidth:1,borderColor:'#DCE3D8'},
 sectionRow:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',gap:8},sectionTitle:{textAlign:'right',writingDirection:'rtl',fontSize:15,fontWeight:'600',color:'#193D32'},link:{textAlign:'right',writingDirection:'rtl',fontSize:12,color:'#456651',lineHeight:23},empty:{padding:22,alignItems:'center',gap:12,borderWidth:1,borderColor:'#E3E7DC',borderRadius:18},iconCircle:{padding:13,borderRadius:50,backgroundColor:'#E9EEE5'},previewLink:{alignItems:'center',padding:6},
 discovery:{flexDirection:'row-reverse',gap:14,alignItems:'center',backgroundColor:'#fff',padding:10,borderRadius:16},thumbnail:{width:64,height:72,borderRadius:10},
 scanner:{height:490,borderRadius:24,overflow:'hidden',backgroundColor:'#193D32'},cameraTop:{position:'absolute',top:24,left:24,right:24,gap:8},cameraText:{textAlign:'right',writingDirection:'rtl',fontSize:11,letterSpacing:0,color:'#fff'},cameraHint:{color:'#fff',fontSize:12,textAlign:'center',lineHeight:20},scanFrame:{position:'absolute',left:40,right:40,top:120,height:225,borderWidth:1,borderColor:'rgba(255,255,255,0.6)',borderRadius:24},cameraBottom:{position:'absolute',bottom:38,left:28,right:28,gap:24},cameraControls:{flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center'},shutter:{width:72,height:72,borderRadius:40,borderWidth:2,borderColor:'#fff',padding:6},shutterInner:{flex:1,borderRadius:40,backgroundColor:'#fff'},previewBadge:{position:'absolute',bottom:10,alignSelf:'center',fontSize:8,color:'#fff',letterSpacing:0},
 card:{backgroundColor:'#FDFCFA',padding:18,borderRadius:16,borderWidth:1,borderColor:'#E3E6DC',gap:14},photoRow:{gap:12},photo:{width:90,height:105,borderRadius:10},remove:{fontSize:11,color:'#758176',textAlign:'center',padding:8},consent:{flexDirection:'row-reverse',gap:10,alignItems:'center'},
 resultPhoto:{width:'100%',height:300,borderRadius:20},detailPhoto:{width:'100%',height:220,borderRadius:20},resultName:{textAlign:'right',writingDirection:'rtl',fontFamily:serif,fontSize:34,lineHeight:42,color:'#193D32'},scientific:{textAlign:'right',writingDirection:'ltr',fontFamily:serif,fontStyle:'italic',fontSize:15,color:'#7B877B',lineHeight:24},meta:{flexDirection:'row-reverse',gap:12,alignItems:'center',flexWrap:'wrap'},pill:{textAlign:'right',writingDirection:'rtl',fontSize:11,color:'#49634D',backgroundColor:'#E8EEE3',paddingVertical:8,paddingHorizontal:12,borderRadius:20},
 warning:{backgroundColor:'#F4EDDD',padding:16,borderRadius:14,gap:9,borderWidth:1,borderColor:'#E9DFC8'},warningTitle:{textAlign:'right',writingDirection:'rtl',fontSize:12,fontWeight:'600',color:'#806127',flex:1},warningBody:{textAlign:'right',writingDirection:'rtl',fontSize:12,lineHeight:20,color:'#6B532E'},banner:{backgroundColor:'#E8EDE5',padding:12,borderRadius:12},note:{textAlign:'right',writingDirection:'rtl',fontSize:12,lineHeight:21,color:'#7B8274'},
 safetyStatus:{flexDirection:'row-reverse',alignItems:'flex-start',gap:7,marginTop:8,paddingVertical:8,paddingHorizontal:10,borderRadius:10,borderWidth:1,borderColor:'#E2D5B6',backgroundColor:'#F8F1E2'},safetyStatusVerified:{borderColor:'#C9DCCF',backgroundColor:'#EDF4EE'},safetyStatusText:{flex:1,textAlign:'right',writingDirection:'rtl',fontSize:13,lineHeight:21,fontWeight:'600',color:'#654E2A'},safetyStatusTextCompact:{fontSize:12,lineHeight:19},
 infoCard:{flexDirection:'row-reverse',gap:12,alignItems:'center',backgroundColor:'#FDFCFA',borderWidth:1,borderColor:'#E3E6DC',borderRadius:16,padding:16},infoIcon:{padding:10,borderRadius:12,backgroundColor:'#EAF0E6'},hebrew:{fontSize:14,lineHeight:24,color:'#5B675E',textAlign:'right',writingDirection:'rtl',marginTop:7},accordion:{paddingVertical:18,borderBottomWidth:1,borderColor:'#E1E5DA',gap:8},
 nav:{flexDirection:'row-reverse',borderTopWidth:1,borderColor:'#E1E5DA',backgroundColor:'#F8F7F2',paddingVertical:13},navItem:{flex:1,alignItems:'center',gap:6},navLabel:{fontSize:10,color:'#6A7B6E'},footer:{fontSize:10,lineHeight:18,textAlign:'center',color:'#8F988B',marginTop:10}
});



