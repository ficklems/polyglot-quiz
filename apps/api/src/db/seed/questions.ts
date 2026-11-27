import type { Language, OptionId } from '@pq/shared';

/** Text in every supported language. */
export type Translated = Record<Language, string>;

/** Option text: one string when it is the same in every language (names, years). */
export type OptionText = string | Translated;

export type QuestionSeed = {
  id: string;
  topicId: string;
  correct: OptionId;
  text: Translated;
  options: Record<OptionId, OptionText>;
};

export function optionTextIn(option: OptionText, lang: Language): string {
  return typeof option === 'string' ? option : option[lang];
}

/*
 * Content rules (see CLAUDE.md): verifiable facts, neutral wording, no lyrics.
 * Adding a question = adding an object here; ids must stay unique and stable.
 */

const MUSIC: QuestionSeed[] = [
  {
    id: 'music-01',
    topicId: 'music-decades',
    correct: 'a',
    text: {
      uk: 'Який гурт випустив альбом «Abbey Road» у 1969 році?',
      en: 'Which band released the album "Abbey Road" in 1969?',
      pl: 'Który zespół wydał album „Abbey Road” w 1969 roku?',
    },
    options: { a: 'The Beatles', b: 'The Rolling Stones', c: 'The Doors', d: 'Pink Floyd' },
  },
  {
    id: 'music-02',
    topicId: 'music-decades',
    correct: 'b',
    text: {
      uk: 'У якому році вийшов перший сингл The Beatles «Love Me Do»?',
      en: 'In which year was the first Beatles single "Love Me Do" released?',
      pl: 'W którym roku ukazał się pierwszy singiel The Beatles „Love Me Do”?',
    },
    options: { a: '1960', b: '1962', c: '1965', d: '1967' },
  },
  {
    id: 'music-03',
    topicId: 'music-decades',
    correct: 'c',
    text: {
      uk: 'Із якою піснею ABBA перемогла на Євробаченні 1974 року?',
      en: 'With which song did ABBA win Eurovision in 1974?',
      pl: 'Z jaką piosenką ABBA wygrała Eurowizję w 1974 roku?',
    },
    options: { a: 'Dancing Queen', b: 'Mamma Mia', c: 'Waterloo', d: 'SOS' },
  },
  {
    id: 'music-04',
    topicId: 'music-decades',
    correct: 'a',
    text: {
      uk: 'У якому році Queen випустили пісню «Bohemian Rhapsody»?',
      en: 'In which year did Queen release "Bohemian Rhapsody"?',
      pl: 'W którym roku Queen wydał utwór „Bohemian Rhapsody”?',
    },
    options: { a: '1975', b: '1971', c: '1979', d: '1982' },
  },
  {
    id: 'music-05',
    topicId: 'music-decades',
    correct: 'd',
    text: {
      uk: 'Хто виконавець альбому «Thriller» (1982)?',
      en: 'Who released the album "Thriller" (1982)?',
      pl: 'Kto wydał album „Thriller” (1982)?',
    },
    options: { a: 'Prince', b: 'Stevie Wonder', c: 'Lionel Richie', d: 'Michael Jackson' },
  },
  {
    id: 'music-06',
    topicId: 'music-decades',
    correct: 'b',
    text: {
      uk: 'Який гурт випустив альбом «Back in Black» (1980)?',
      en: 'Which band released the album "Back in Black" (1980)?',
      pl: 'Który zespół wydał album „Back in Black” (1980)?',
    },
    options: { a: 'Iron Maiden', b: 'AC/DC', c: 'Def Leppard', d: 'Metallica' },
  },
  {
    id: 'music-07',
    topicId: 'music-decades',
    correct: 'a',
    text: {
      uk: 'Який гурт випустив альбом «Nevermind» (1991)?',
      en: 'Which band released the album "Nevermind" (1991)?',
      pl: 'Który zespół wydał album „Nevermind” (1991)?',
    },
    options: { a: 'Nirvana', b: 'Pearl Jam', c: 'Soundgarden', d: 'Radiohead' },
  },
  {
    id: 'music-08',
    topicId: 'music-decades',
    correct: 'c',
    text: {
      uk: 'Який гурт випустив альбом «OK Computer» (1997)?',
      en: 'Which band released the album "OK Computer" (1997)?',
      pl: 'Który zespół wydał album „OK Computer” (1997)?',
    },
    options: { a: 'Oasis', b: 'Blur', c: 'Radiohead', d: 'Muse' },
  },
  {
    id: 'music-09',
    topicId: 'music-decades',
    correct: 'b',
    text: {
      uk: 'З якої країни походить дует Daft Punk?',
      en: 'Which country is the duo Daft Punk from?',
      pl: 'Z jakiego kraju pochodzi duet Daft Punk?',
    },
    options: {
      a: { uk: 'Бельгія', en: 'Belgium', pl: 'Belgia' },
      b: { uk: 'Франція', en: 'France', pl: 'Francja' },
      c: { uk: 'Німеччина', en: 'Germany', pl: 'Niemcy' },
      d: { uk: 'Швейцарія', en: 'Switzerland', pl: 'Szwajcaria' },
    },
  },
  {
    id: 'music-10',
    topicId: 'music-decades',
    correct: 'c',
    text: {
      uk: 'У якому році Руслана перемогла на Євробаченні?',
      en: 'In which year did Ruslana win Eurovision?',
      pl: 'W którym roku Rusłana wygrała Eurowizję?',
    },
    options: { a: '2002', b: '2006', c: '2004', d: '2008' },
  },
  {
    id: 'music-11',
    topicId: 'music-decades',
    correct: 'a',
    text: {
      uk: 'Хто є лідером і вокалістом гурту «Океан Ельзи»?',
      en: 'Who is the frontman of the band Okean Elzy?',
      pl: 'Kto jest liderem i wokalistą zespołu Okean Elzy?',
    },
    options: {
      a: { uk: 'Святослав Вакарчук', en: 'Sviatoslav Vakarchuk', pl: 'Swiatosław Wakarczuk' },
      b: { uk: 'Олег Скрипка', en: 'Oleh Skrypka', pl: 'Ołeh Skrypka' },
      c: { uk: 'Андрій Хливнюк', en: 'Andriy Khlyvnyuk', pl: 'Andrij Chływniuk' },
      d: { uk: 'Олег Псюк', en: 'Oleh Psiuk', pl: 'Ołeh Psiuk' },
    },
  },
  {
    id: 'music-12',
    topicId: 'music-decades',
    correct: 'd',
    text: {
      uk: 'Хто записав пісню «Dziwny jest ten świat» (1967)?',
      en: 'Who recorded the song "Dziwny jest ten świat" (1967)?',
      pl: 'Kto nagrał piosenkę „Dziwny jest ten świat” (1967)?',
    },
    options: {
      a: { uk: 'Марек Грехута', en: 'Marek Grechuta', pl: 'Marek Grechuta' },
      b: { uk: 'Кшиштоф Кравчик', en: 'Krzysztof Krawczyk', pl: 'Krzysztof Krawczyk' },
      c: { uk: 'Северин Краєвський', en: 'Seweryn Krajewski', pl: 'Seweryn Krajewski' },
      d: { uk: 'Чеслав Немен', en: 'Czesław Niemen', pl: 'Czesław Niemen' },
    },
  },
  {
    id: 'music-13',
    topicId: 'music-decades',
    correct: 'b',
    text: {
      uk: 'Хто випустив альбом «21» (2011)?',
      en: 'Who released the album "21" (2011)?',
      pl: 'Kto wydał album „21” (2011)?',
    },
    options: { a: 'Amy Winehouse', b: 'Adele', c: 'Duffy', d: 'Florence + the Machine' },
  },
  {
    id: 'music-14',
    topicId: 'music-decades',
    correct: 'c',
    text: {
      uk: 'Хто представляв Україну з піснею «1944» і переміг на Євробаченні 2016?',
      en: 'Who represented Ukraine with the song "1944" and won Eurovision 2016?',
      pl: 'Kto reprezentował Ukrainę z piosenką „1944” i wygrał Eurowizję 2016?',
    },
    options: {
      a: { uk: 'Тіна Кароль', en: 'Tina Karol', pl: 'Tina Karol' },
      b: { uk: 'Руслана', en: 'Ruslana', pl: 'Rusłana' },
      c: { uk: 'Джамала', en: 'Jamala', pl: 'Jamala' },
      d: { uk: 'Вєрка Сердючка', en: 'Verka Serduchka', pl: 'Wierka Serduczka' },
    },
  },
  {
    id: 'music-15',
    topicId: 'music-decades',
    correct: 'a',
    text: {
      uk: 'Який гурт переміг на Євробаченні 2022 з піснею «Stefania»?',
      en: 'Which band won Eurovision 2022 with the song "Stefania"?',
      pl: 'Który zespół wygrał Eurowizję 2022 piosenką „Stefania”?',
    },
    options: { a: 'Kalush Orchestra', b: 'Go_A', c: 'The Hardkiss', d: 'Okean Elzy' },
  },
];

const HISTORY: QuestionSeed[] = [
  {
    id: 'history-01',
    topicId: 'region-history',
    correct: 'c',
    text: {
      uk: 'У якому році Україна проголосила незалежність?',
      en: 'In which year did Ukraine declare independence?',
      pl: 'W którym roku Ukraina ogłosiła niepodległość?',
    },
    options: { a: '1989', b: '1990', c: '1991', d: '1992' },
  },
  {
    id: 'history-02',
    topicId: 'region-history',
    correct: 'b',
    text: {
      uk: 'У якому році Польща вступила до Європейського Союзу?',
      en: 'In which year did Poland join the European Union?',
      pl: 'W którym roku Polska wstąpiła do Unii Europejskiej?',
    },
    options: { a: '1999', b: '2004', c: '2007', d: '2009' },
  },
  {
    id: 'history-03',
    topicId: 'region-history',
    correct: 'a',
    text: {
      uk: 'У якому році Польща вступила до НАТО?',
      en: 'In which year did Poland join NATO?',
      pl: 'W którym roku Polska wstąpiła do NATO?',
    },
    options: { a: '1999', b: '1995', c: '2004', d: '2009' },
  },
  {
    id: 'history-04',
    topicId: 'region-history',
    correct: 'b',
    text: {
      uk: 'У якому році відбулася Грюнвальдська битва?',
      en: 'In which year was the Battle of Grunwald fought?',
      pl: 'W którym roku stoczono bitwę pod Grunwaldem?',
    },
    options: { a: '1385', b: '1410', c: '1525', d: '1569' },
  },
  {
    id: 'history-05',
    topicId: 'region-history',
    correct: 'd',
    text: {
      uk: 'У якому році Люблінська унія утворила Річ Посполиту?',
      en: 'In which year did the Union of Lublin create the Polish–Lithuanian Commonwealth?',
      pl: 'W którym roku unia lubelska utworzyła Rzeczpospolitą Obojga Narodów?',
    },
    options: { a: '1410', b: '1505', c: '1648', d: '1569' },
  },
  {
    id: 'history-06',
    topicId: 'region-history',
    correct: 'b',
    text: {
      uk: 'У якому році в Польщі ухвалили Конституцію 3 травня?',
      en: 'In which year was Poland’s Constitution of 3 May adopted?',
      pl: 'W którym roku uchwalono Konstytucję 3 Maja?',
    },
    options: { a: '1772', b: '1791', c: '1795', d: '1815' },
  },
  {
    id: 'history-07',
    topicId: 'region-history',
    correct: 'c',
    text: {
      uk: 'У якому році сталася аварія на Чорнобильській АЕС?',
      en: 'In which year did the Chornobyl nuclear disaster happen?',
      pl: 'W którym roku doszło do katastrofy w elektrowni jądrowej w Czarnobylu?',
    },
    options: { a: '1979', b: '1983', c: '1986', d: '1991' },
  },
  {
    id: 'history-08',
    topicId: 'region-history',
    correct: 'a',
    text: {
      uk: 'Хто, згідно з легендою, заснував Київ разом із братами та сестрою?',
      en: 'According to legend, who founded Kyiv together with his brothers and sister?',
      pl: 'Kto według legendy założył Kijów wraz z braćmi i siostrą?',
    },
    options: {
      a: { uk: 'Кий', en: 'Kyi', pl: 'Kij' },
      b: { uk: 'Олег', en: 'Oleh', pl: 'Oleg' },
      c: { uk: 'Ярослав', en: 'Yaroslav', pl: 'Jarosław' },
      d: { uk: 'Святослав', en: 'Sviatoslav', pl: 'Światosław' },
    },
  },
  {
    id: 'history-09',
    topicId: 'region-history',
    correct: 'b',
    text: {
      uk: 'У якому році відбулося хрещення Київської Русі?',
      en: 'In which year did the Christianization of Kyivan Rus take place?',
      pl: 'W którym roku nastąpił chrzest Rusi Kijowskiej?',
    },
    options: { a: '966', b: '988', c: '1054', d: '1240' },
  },
  {
    id: 'history-10',
    topicId: 'region-history',
    correct: 'a',
    text: {
      uk: 'У якому році відбулося хрещення Польщі?',
      en: 'In which year did the Baptism of Poland take place?',
      pl: 'W którym roku odbył się chrzest Polski?',
    },
    options: { a: '966', b: '988', c: '1025', d: '1138' },
  },
  {
    id: 'history-11',
    topicId: 'region-history',
    correct: 'c',
    text: {
      uk: 'У якому місті 1980 року виникла профспілка «Солідарність»?',
      en: 'In which city was the Solidarity trade union founded in 1980?',
      pl: 'W którym mieście w 1980 roku powstał związek zawodowy „Solidarność”?',
    },
    options: {
      a: { uk: 'Варшава', en: 'Warsaw', pl: 'Warszawa' },
      b: { uk: 'Краків', en: 'Kraków', pl: 'Kraków' },
      c: { uk: 'Гданськ', en: 'Gdańsk', pl: 'Gdańsk' },
      d: { uk: 'Лодзь', en: 'Łódź', pl: 'Łódź' },
    },
  },
  {
    id: 'history-12',
    topicId: 'region-history',
    correct: 'd',
    text: {
      uk: 'Хто був першим президентом незалежної України?',
      en: 'Who was the first president of independent Ukraine?',
      pl: 'Kto był pierwszym prezydentem niepodległej Ukrainy?',
    },
    options: {
      a: { uk: 'Леонід Кучма', en: 'Leonid Kuchma', pl: 'Łeonid Kuczma' },
      b: { uk: 'Віктор Ющенко', en: 'Viktor Yushchenko', pl: 'Wiktor Juszczenko' },
      c: { uk: 'Віктор Янукович', en: 'Viktor Yanukovych', pl: 'Wiktor Janukowycz' },
      d: { uk: 'Леонід Кравчук', en: 'Leonid Kravchuk', pl: 'Łeonid Krawczuk' },
    },
  },
  {
    id: 'history-13',
    topicId: 'region-history',
    correct: 'b',
    text: {
      uk: 'У якій країні 1989 року відбулася «Оксамитова революція»?',
      en: 'In which country did the Velvet Revolution take place in 1989?',
      pl: 'W którym kraju w 1989 roku doszło do aksamitnej rewolucji?',
    },
    options: {
      a: { uk: 'Угорщина', en: 'Hungary', pl: 'Węgry' },
      b: { uk: 'Чехословаччина', en: 'Czechoslovakia', pl: 'Czechosłowacja' },
      c: { uk: 'Румунія', en: 'Romania', pl: 'Rumunia' },
      d: { uk: 'Болгарія', en: 'Bulgaria', pl: 'Bułgaria' },
    },
  },
  {
    id: 'history-14',
    topicId: 'region-history',
    correct: 'a',
    text: {
      uk: 'Яке місто було столицею Польщі до Варшави?',
      en: 'Which city was the capital of Poland before Warsaw?',
      pl: 'Które miasto było stolicą Polski przed Warszawą?',
    },
    options: {
      a: { uk: 'Краків', en: 'Kraków', pl: 'Kraków' },
      b: { uk: 'Гнєзно', en: 'Gniezno', pl: 'Gniezno' },
      c: { uk: 'Познань', en: 'Poznań', pl: 'Poznań' },
      d: { uk: 'Люблін', en: 'Lublin', pl: 'Lublin' },
    },
  },
  {
    id: 'history-15',
    topicId: 'region-history',
    correct: 'c',
    text: {
      uk: 'Під якою німецькою назвою Вроцлав був відомий до 1945 року?',
      en: 'Under which German name was Wrocław known before 1945?',
      pl: 'Pod jaką niemiecką nazwą znany był Wrocław przed 1945 rokiem?',
    },
    options: { a: 'Danzig', b: 'Stettin', c: 'Breslau', d: 'Königsberg' },
  },
];

const GENERAL: QuestionSeed[] = [
  {
    id: 'general-01',
    topicId: 'general-knowledge',
    correct: 'b',
    text: {
      uk: 'Яка найбільша планета Сонячної системи?',
      en: 'What is the largest planet in the Solar System?',
      pl: 'Jaka jest największa planeta Układu Słonecznego?',
    },
    options: {
      a: { uk: 'Сатурн', en: 'Saturn', pl: 'Saturn' },
      b: { uk: 'Юпітер', en: 'Jupiter', pl: 'Jowisz' },
      c: { uk: 'Нептун', en: 'Neptune', pl: 'Neptun' },
      d: { uk: 'Земля', en: 'Earth', pl: 'Ziemia' },
    },
  },
  {
    id: 'general-02',
    topicId: 'general-knowledge',
    correct: 'a',
    text: {
      uk: 'Який хімічний символ золота?',
      en: 'What is the chemical symbol for gold?',
      pl: 'Jaki jest symbol chemiczny złota?',
    },
    options: { a: 'Au', b: 'Ag', c: 'Gd', d: 'Go' },
  },
  {
    id: 'general-03',
    topicId: 'general-knowledge',
    correct: 'c',
    text: {
      uk: 'Яка найдовша річка Європи?',
      en: 'What is the longest river in Europe?',
      pl: 'Jaka jest najdłuższa rzeka Europy?',
    },
    options: {
      a: { uk: 'Дунай', en: 'Danube', pl: 'Dunaj' },
      b: { uk: 'Дніпро', en: 'Dnipro', pl: 'Dniepr' },
      c: { uk: 'Волга', en: 'Volga', pl: 'Wołga' },
      d: { uk: 'Рейн', en: 'Rhine', pl: 'Ren' },
    },
  },
  {
    id: 'general-04',
    topicId: 'general-knowledge',
    correct: 'd',
    text: {
      uk: 'Яка найвища гора світу?',
      en: 'What is the highest mountain in the world?',
      pl: 'Jaka jest najwyższa góra świata?',
    },
    options: {
      a: { uk: 'K2', en: 'K2', pl: 'K2' },
      b: { uk: 'Канченджанга', en: 'Kangchenjunga', pl: 'Kanczendzonga' },
      c: { uk: 'Монблан', en: 'Mont Blanc', pl: 'Mont Blanc' },
      d: { uk: 'Еверест', en: 'Mount Everest', pl: 'Mount Everest' },
    },
  },
  {
    id: 'general-05',
    topicId: 'general-knowledge',
    correct: 'a',
    text: {
      uk: 'Хто написав картину «Мона Ліза»?',
      en: 'Who painted the Mona Lisa?',
      pl: 'Kto namalował Mona Lisę?',
    },
    options: {
      a: { uk: 'Леонардо да Вінчі', en: 'Leonardo da Vinci', pl: 'Leonardo da Vinci' },
      b: { uk: 'Мікеланджело', en: 'Michelangelo', pl: 'Michał Anioł' },
      c: { uk: 'Рафаель', en: 'Raphael', pl: 'Rafael' },
      d: { uk: 'Боттічеллі', en: 'Botticelli', pl: 'Botticelli' },
    },
  },
  {
    id: 'general-06',
    topicId: 'general-knowledge',
    correct: 'b',
    text: {
      uk: 'Хто разом із чоловіком відкрив полоній і радій?',
      en: 'Who discovered polonium and radium together with her husband?',
      pl: 'Kto wraz z mężem odkrył polon i rad?',
    },
    options: {
      a: { uk: 'Ліза Мейтнер', en: 'Lise Meitner', pl: 'Lise Meitner' },
      b: {
        uk: 'Марія Склодовська-Кюрі',
        en: 'Marie Skłodowska-Curie',
        pl: 'Maria Skłodowska-Curie',
      },
      c: { uk: 'Розалінд Франклін', en: 'Rosalind Franklin', pl: 'Rosalind Franklin' },
      d: { uk: 'Ада Лавлейс', en: 'Ada Lovelace', pl: 'Ada Lovelace' },
    },
  },
  {
    id: 'general-07',
    topicId: 'general-knowledge',
    correct: 'c',
    text: {
      uk: 'За якої температури (°C) кипить вода на рівні моря?',
      en: 'At what temperature (°C) does water boil at sea level?',
      pl: 'W jakiej temperaturze (°C) wrze woda na poziomie morza?',
    },
    options: { a: '90', b: '95', c: '100', d: '110' },
  },
  {
    id: 'general-08',
    topicId: 'general-knowledge',
    correct: 'a',
    text: {
      uk: 'Який океан найбільший?',
      en: 'Which is the largest ocean?',
      pl: 'Który ocean jest największy?',
    },
    options: {
      a: { uk: 'Тихий', en: 'Pacific', pl: 'Spokojny' },
      b: { uk: 'Атлантичний', en: 'Atlantic', pl: 'Atlantycki' },
      c: { uk: 'Індійський', en: 'Indian', pl: 'Indyjski' },
      d: { uk: 'Північний Льодовитий', en: 'Arctic', pl: 'Arktyczny' },
    },
  },
  {
    id: 'general-09',
    topicId: 'general-knowledge',
    correct: 'd',
    text: {
      uk: 'Яке місто є столицею Канади?',
      en: 'What is the capital of Canada?',
      pl: 'Jakie miasto jest stolicą Kanady?',
    },
    options: {
      a: { uk: 'Торонто', en: 'Toronto', pl: 'Toronto' },
      b: { uk: 'Ванкувер', en: 'Vancouver', pl: 'Vancouver' },
      c: { uk: 'Монреаль', en: 'Montreal', pl: 'Montreal' },
      d: { uk: 'Оттава', en: 'Ottawa', pl: 'Ottawa' },
    },
  },
  {
    id: 'general-10',
    topicId: 'general-knowledge',
    correct: 'b',
    text: {
      uk: 'Скільки сторін має шестикутник?',
      en: 'How many sides does a hexagon have?',
      pl: 'Ile boków ma sześciokąt?',
    },
    options: { a: '5', b: '6', c: '7', d: '8' },
  },
  {
    id: 'general-11',
    topicId: 'general-knowledge',
    correct: 'a',
    text: {
      uk: 'Хто автор збірки «Кобзар»?',
      en: 'Who wrote the poetry collection "Kobzar"?',
      pl: 'Kto jest autorem zbioru poezji „Kobziarz”?',
    },
    options: {
      a: { uk: 'Тарас Шевченко', en: 'Taras Shevchenko', pl: 'Taras Szewczenko' },
      b: { uk: 'Іван Франко', en: 'Ivan Franko', pl: 'Iwan Franko' },
      c: { uk: 'Леся Українка', en: 'Lesya Ukrainka', pl: 'Łesia Ukrainka' },
      d: {
        uk: 'Михайло Коцюбинський',
        en: 'Mykhailo Kotsiubynsky',
        pl: 'Mychajło Kociubynski',
      },
    },
  },
  {
    id: 'general-12',
    topicId: 'general-knowledge',
    correct: 'c',
    text: {
      uk: 'Хто автор поеми «Пан Тадеуш»?',
      en: 'Who wrote the epic poem "Pan Tadeusz"?',
      pl: 'Kto jest autorem „Pana Tadeusza”?',
    },
    options: {
      a: { uk: 'Юліуш Словацький', en: 'Juliusz Słowacki', pl: 'Juliusz Słowacki' },
      b: { uk: 'Генрик Сенкевич', en: 'Henryk Sienkiewicz', pl: 'Henryk Sienkiewicz' },
      c: { uk: 'Адам Міцкевич', en: 'Adam Mickiewicz', pl: 'Adam Mickiewicz' },
      d: { uk: 'Болеслав Прус', en: 'Bolesław Prus', pl: 'Bolesław Prus' },
    },
  },
  {
    id: 'general-13',
    topicId: 'general-knowledge',
    correct: 'b',
    text: {
      uk: 'Яку планету називають «Червоною планетою»?',
      en: 'Which planet is known as the "Red Planet"?',
      pl: 'Którą planetę nazywa się „Czerwoną Planetą”?',
    },
    options: {
      a: { uk: 'Венера', en: 'Venus', pl: 'Wenus' },
      b: { uk: 'Марс', en: 'Mars', pl: 'Mars' },
      c: { uk: 'Меркурій', en: 'Mercury', pl: 'Merkury' },
      d: { uk: 'Юпітер', en: 'Jupiter', pl: 'Jowisz' },
    },
  },
  {
    id: 'general-14',
    topicId: 'general-knowledge',
    correct: 'd',
    text: {
      uk: 'Яка найшвидша наземна тварина?',
      en: 'What is the fastest land animal?',
      pl: 'Jakie jest najszybsze zwierzę lądowe?',
    },
    options: {
      a: { uk: 'Лев', en: 'Lion', pl: 'Lew' },
      b: { uk: 'Кінь', en: 'Horse', pl: 'Koń' },
      c: { uk: 'Ведмідь грізлі', en: 'Grizzly bear', pl: 'Niedźwiedź grizzly' },
      d: { uk: 'Гепард', en: 'Cheetah', pl: 'Gepard' },
    },
  },
  {
    id: 'general-15',
    topicId: 'general-knowledge',
    correct: 'a',
    text: {
      uk: 'Хто сформулював теорію відносності?',
      en: 'Who formulated the theory of relativity?',
      pl: 'Kto sformułował teorię względności?',
    },
    options: {
      a: { uk: 'Альберт Ейнштейн', en: 'Albert Einstein', pl: 'Albert Einstein' },
      b: { uk: 'Ісаак Ньютон', en: 'Isaac Newton', pl: 'Izaak Newton' },
      c: { uk: 'Нільс Бор', en: 'Niels Bohr', pl: 'Niels Bohr' },
      d: { uk: 'Макс Планк', en: 'Max Planck', pl: 'Max Planck' },
    },
  },
];

export const QUESTION_SEEDS: QuestionSeed[] = [...MUSIC, ...HISTORY, ...GENERAL];
