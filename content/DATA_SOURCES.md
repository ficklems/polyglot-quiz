# Provenance and data sources

## Data actually used

- CountryInfo, installed 0.1.2, https://github.com/porimol/countryinfo — MIT project license, Copyright (c) Porimol Chandro. Geographic fact snapshot, not up-to-date population data. CountryInfo-derived facts plus manually corrected coordinates are included in structured_facts.json. Upstream data provenance may vary; review source-specific notices before external publication.
- Babel / Unicode CLDR, https://cldr.unicode.org/ and https://www.unicode.org/license.txt — localized country, language and currency data; Unicode data license. Babel package uses BSD license.
- pycountry, https://github.com/pycountry/pycountry — ISO code lookup via installed snapshot; underlying ISO data provenance and license notices should be retained when redistributed.
- RDKit, https://www.rdkit.org/ — element symbols and atomic numbers (BSD project license). Cross-reference: NIST https://physics.nist.gov/PhysRefData/Handbook/atomic_number.htm. Element name translations are authored and need proofreading.
- NASA https://science.nasa.gov/solar-system/planets/ and https://science.nasa.gov/solar-system/planets/planet-sizes-and-locations-in-our-solar-system/ — planet size and orbital comparisons using rounded factual values. NASA chronology https://nssdc.gsfc.nasa.gov/planetary/chrono.html.
- IOC https://www.olympics.com/ioc/celebrate-olympic-games — Olympic edition and host reference. Historical host facts authored, not copied from article prose.
- IANA https://www.iana.org/domains/root/db — country-code TLD reference. CLDR is used for country codes, subject to IANA confirmation.
- MusicBrainz https://musicbrainz.org/, Open Library https://openlibrary.org/, Wikidata https://www.wikidata.org/, Britannica https://www.britannica.com/, NIST forensic science https://www.nist.gov/forensic-science and other per-record URLs: references for fact-checking authored trivia, not bulk scraped sources. Question wording and emoji clues are original. No lyric excerpts or audio.

## Open archives identified, not downloaded or imported

- OpenTriviaQA https://github.com/uberspot/OpenTriviaQA — CC BY-SA 4.0.
- Open Trivia DB https://opentdb.com/ — CC BY-SA 4.0.
- QuizBase https://quizbase.runriva.com/data; release https://github.com/maciejdzierzek/quizbase-dumps-byasa/releases/tag/v2026-05-04 — CC BY-SA 4.0 enrichment dump. Release advertises 48,862 EN and 48,853 PL OpenTriviaQA rows. Preserve attribution, change notices and share-alike terms on derived data. No archive rows included here because download failed.

All external links are references; `sources` metadata is not proof of independent individual fact verification. This package does not assert that every fact or translation is checked. Review licenses before public distribution.

## Current upload-based import (supersedes prior no-download status)

- Uploaded OpenTriviaQA original ZIP used to map source topics (49,716 categorized entries, including overlaps); no separate duplicate import of the original. License included.
- Uploaded QuizBase OpenTriviaQA EN and PL files joined by source_id; CC BY-SA 4.0 attribution preserved per record. Refinements and Polish translations by QuizBase.
- Uploaded OpenTDB and ARC PL-only files kept in separate review queue; per-record source metadata and CC BY-SA 4.0 retained.
- Uploaded MKQA: EN/PL short-answer pairs in separate queue; CC BY-SA 3.0 per https://github.com/apple-aiml-research/ml-mkqa/blob/main/README.md. No Ukrainian available in source. No options generated for these QA pairs.
- Input files were supplied by user; no upstream checksum manifest available. See validation_report.json for actual counts and limitations.

## Quality review edition

Specific checked external sources are recorded per question in review/externally_fact_checked.jsonl (Royal Society of Chemistry, Ptable, NASA, and other institutions). Local CLDR/Babel and ISO code checks are consistency checks only. Original dataset agreement is not independent verification.

## Ukrainian revision

Independent checks for selected year records are recorded in each record. The local translation runner refers to the public Argos EN→UK model: https://data.argosopentech.com/argospm/v1/translate-en_uk-1_4.argosmodel. Package documentation: https://github.com/argosopentech/argos-translate. Model weights are not distributed in this archive. Review model provenance and original data licensing before redistribution.

## Machine translation revision

User-supplied Argos EN→UK 1.4 model, https://data.argosopentech.com/argospm/v1/translate-en_uk-1_4.argosmodel, executed using CTranslate2 4.6.0 and SentencePiece. Training credits are in licenses/Argos_model_credits.md. Model weights are not redistributed. New manually checked sources are recorded in review/new_manual_source_checks.json and individual records. Machine translation is not source verification.

## Editorial revision

Additional individually checked sources are attached to the relevant records, including NASA, US National Archives, USGS, IOC and GOV.UK. Internal mathematical derivations and local structured-data consistency are labeled separately from independent external fact verification. No assertion of full review.

## Original-name and quarantine follow-up

Restored and revised records carry per-record independent sources where checked. Musical name and title restorations use English/Polish source alignment, not an exhaustive official discography check. Preserve all original CC BY-SA credits, and identify this package’s multilingual editorial modifications.

## Research expansion

See RESEARCH_SOURCES.md for the factual references and separate future research leads. No bulk import of third-party quiz wording.

## Skryabin, memes and public political remarks — sources used in this update

Original question wording and explanations; limited short quotations retain their documented original language. No images, screenshots, music recordings, song lyrics or video clips are distributed. References are not blanket permission to reproduce source texts or media. Independently review quoted wording, attribution and rights before publishing.

- [Цензор.НЕТ — історія ролика Добкіна й Кернеса](https://censor.net/ua/videonews/461218/tekst_podebilnomu_napysanyyi_jurnalistka_rozpovila_yak_zyavyvsya_rolyk_z_dobkinym_i_kernesom_video)
- [Енциклопедія Сучасної України — Кузьма](https://esu.com.ua/article-1503)
- [Главком — вірусні відео політиків](https://glavcom.ua/country/politics/dyuzhina-video-politikiv-yaki-pidirvali-internet-495012.html)
- [ГОРДОН — інтерв’ю Кернеса про ролик](https://gordonua.com/ukr/news/politics/u-tsomu-pitanni-nam-palets-v-rot-ne-kladi-v-interv-ju-gordonu-v-2013-rotsi-kernes-prokomentuvav-vihid-vidomogo-rolika-pro-nudne-oblichchja-1538168.html)
- [Know Your Meme — Woman Yelling at a Cat interview](https://knowyourmeme.com/editorials/interviews/woman-yelling-at-cat-meme-and-real-housewives-star-taylor-armstrong-on-the-memes-tragic-backstory-baby-theres-no-plane-and-more)
- [Know Your Meme — distracted](https://knowyourmeme.com/memes/distracted-boyfriend)
- [Know Your Meme — grumpy](https://knowyourmeme.com/memes/grumpy-cat)
- [Know Your Meme — harold](https://knowyourmeme.com/memes/hide-the-pain-harold)
- [Know Your Meme — ice](https://knowyourmeme.com/memes/ice-bucket-challenge)
- [Know Your Meme — girlfriend](https://knowyourmeme.com/memes/overly-attached-girlfriend)
- [Know Your Meme — rick](https://knowyourmeme.com/memes/rickroll)
- [Know Your Meme — fine](https://knowyourmeme.com/memes/this-is-fine)
- [Know Your Meme — troll](https://knowyourmeme.com/memes/trollface)
- [Know Your Meme — doge](https://knowyourmeme.com/sensitive/memes/doge)
- [Know Your Meme — keyboard](https://knowyourmeme.com/sensitive/memes/keyboard-cat)
- [Know Your Meme — nyan](https://knowyourmeme.com/sensitive/memes/nyan-cat)
- [ICTV — Скрябін. Постскриптум](https://skryabin.ictv.ua/)
- [Суспільне — інтерв’ю з Ростиславом Домішевським](https://suspilne.media/culture/101527-absolutna-energia-spivzasnovnik-gurtu-skrabin-podilivsa-spogadami-pro-kuzmu/)
- [Суспільне Культура — ранній Скрябін](https://suspilne.media/culture/1089580-smert-slozi-i-sni-ak-rannij-skrabin-zmusiv-sumuvati-za-domom-usih-kiivskih-ponaihavsih/)
- [Суспільне — історія альбому Казки](https://suspilne.media/culture/262873-persij-podvijnij-albom-v-istorii-ukrainskoi-muziki-gurt-skrabin-kazki/)
- [Суспільне Культура — меми 2022 року](https://suspilne.media/culture/348110-dobrogo-vecora-everybody-cej-den-nastav-mi-pidgotuvali-pidbirku-golovnih-memiv-2022-roku/)
- [Суспільне Культура — COOL’туримо](https://suspilne.media/culture/408648-memi-aki-dopomagaut-ne-zihati-z-gluzdu-specepizod/)
- [Drive Radio — гурт Скрябін](https://www.driveradio.com.ua/post/artyst_tyzhnya_hurt_skryabin)
- [Dziennik Gazeta Prawna — wypowiedź Bieńkowskiej](https://www.gazetaprawna.pl/wiadomosci/artykuly/771789%2Cbienkowska-o-opoznieniach-pociagow-z-powodu-mrozu.html)
- [Polska Agencja Prasowa — Janusz Nosacz](https://www.pap.pl/aktualnosci/medioznawca-o-internetowych-memach-z-januszem-nosaczem-akty-przemocy-symbolicznej)
- [Українські пісні — біографія Скрябіна](https://www.pisni.org.ua/persons/175.html)
- [Polskie Radio — język polskiego internetu](https://www.polskieradio.pl/10/485/artykul/565592%2Cco-ja-pacze-ale-urwal-jezyk-polskiego-internetu)
- [Українська правда — політичні меми](https://www.pravda.com.ua/articles/2018/08/23/7153335/)
- [Ronald Reagan Presidential Library — 1984 debate transcript](https://www.reaganlibrary.gov/archives/speech/debate-between-president-and-former-vice-president-walter-f-mondale-kansas-city)
- [УНІАН — пісні та кліпи Скрябіна](https://www.unian.ua/lite/kino/skryabinu-vipovnilosya-b-53-klipi-yaki-zalishatsya-v-sercyah-sluhachiv-nazavzhdi-11515630.html)

## Independent audit — 2026-11-27

Specific answer checks and their scope are recorded in `review/independent_fact_evidence.jsonl`. References below were consulted during this audit; no blanket claim of license or factual correctness.

- [1+1](https://1plus1.ua/novyny/irina-bilik-perespivala-pisnu-movcati-ih-dusi-iz-nami-budut-poruc-stoati-a-mi-ih-zgadaemo-i-budem-movcati)
- [BoardGameGeek](https://boardgamegeek.com/boardgame/891/cranium)
- [Museum of Applied Arts, Budapest](https://collections.imm.hu/gyujtemeny/jatek-buvos-kocka/2382)
- [Detector Media](https://detector.media/withoutsection/article/40164/2008-08-22-pidyom-na-novomu-kanali-vestymut-sergiy-prytula-oleksandr-pedan-gennadiy-popenko-i-olga-freymut/)
- [Detector Media](https://detector.media/withoutsection/article/59373/2011-01-20-vid-pershogo-milyona-do-kh-faktora/)
- [Detector Media](https://detector.media/withoutsection/article/64838/2011-08-05-novyy-zapustyt-sotsialnyy-proekt-z-freymut/)
- [American Psychological Association](https://dictionary.apa.org/chunking)
- [American Psychological Association](https://dictionary.apa.org/classical-conditioning)
- [American Psychological Association](https://dictionary.apa.org/episodic-memory)
- [American Psychological Association](https://dictionary.apa.org/observational-learning)
- [American Psychological Association](https://dictionary.apa.org/operant-conditioning)
- [American Psychological Association](https://dictionary.apa.org/proactive-interference)
- [American Psychological Association](https://dictionary.apa.org/procedural-memory)
- [American Psychological Association](https://dictionary.apa.org/retroactive-interference)
- [American Psychological Association](https://dictionary.apa.org/semantic-memory)
- [Glavcom](https://glavcom.ua/amp/country/politics/dyuzhina-video-politikiv-yaki-pidirvali-internet-495012.html)
- [Gordon — Kernes interview and video context](https://gordonua.com/ukr/news/politics/u-tsomu-pitanni-nam-palets-v-rot-ne-kladi-v-interv-ju-gordonu-v-2013-rotsi-kernes-prokomentuvav-vihid-vidomogo-rolika-pro-nudne-oblichchja-1538168.html)
- [Gordon — Azarov interview](https://gordonua.com/ukr/publications/azarov-potrbno-bulo-zolyuvati-tyagniboka-pashinskogo-turchinova-yacenyuka-a-olgarhv-yak-grosh-vidlyali-na-maydan-vzyati-za-shkrku-1334944.html)
- [Hromadske Radio](https://hromadske.radio/podcasts/kyiv-donbas/nad-yakymy-politychnymy-memamy-my-smiyalys-naybilshe-za-26-rokiv-nezalezhnosti)
- [Hromadske](https://hromadske.ua/posts/pid-ukrnaftoiu-kolomoiskyi-i-naiiem-ziasovuiut-khto-reider-video)
- [Кінобаза](https://kinobazaua.com/titles/karaoke-na-maidane)
- [Kotaku — creator interview](https://kotaku.com/the-maker-of-the-trollface-meme-is-counting-his-money-1696228810)
- [Verkhovna Rada — stenographic record](https://meeting.rada.gov.ua/work/vote/en/pz-20200305)
- [Minatrix discographic overview](https://minatrix.com.ua/artists/name/skrjabin/)
- [Ministry of Internal Affairs of Ukraine](https://mvs.gov.ua/en/news/memi-viini)
- [NASA NSSDCA](https://nssdc.gsfc.nasa.gov/planetary/factsheet/)
- [NV](https://nv.ua/ukr/ukraine/events/memi-2022-dzhonsonyuk-himars-bayraktari-chim-dilyatsya-ukrajinci-pid-chas-viyni-novini-ukrajini-50259058.html)
- [University of Warsaw](https://obserwatoriumjezykowe.uw.edu.pl/hasla/cojapacze/)
- [People — interview](https://people.com/overly-attached-girlfriend-gets-honest-about-becoming-a-meme-exclusive-11700522)
- [NCBI PubChem](https://pubchem.ncbi.nlm.nih.gov/periodic-table/pdf/Periodic_Table_of_Elements_w_Names_PubChem.pdf)
- [SWPS University research repository](https://share.swps.edu.pl/handle/swps/612)
- [TIME](https://time.com/5762380/woman-yelling-at-cat-meme/)
- [CNN transcript](https://transcripts.cnn.com/show/ltm/date/2009-05-07/segment/03)
- [Korrespondent.net](https://ua.korrespondent.net/ukraine/politics/3403194-ne-tilky-lyshe-vsi-klychko-rozpoviv-pro-pohliad-u-zavtrashnii-den)
- [ALS Association](https://www.als.org/IBC/commitments)
- [Government of Argentina — animation history](https://www.argentina.gob.ar/node/484074)
- [CBS News — interview](https://www.cbsnews.com/news/nyan-cats-creator-talks-to-bnet-about-marketing-merchandising-and-pirates/)
- [Commission on Presidential Debates](https://www.debates.org/voter-education/debate-transcripts/october-21-1984-debate-transcript/)
- [EBSCO Research Starters](https://www.ebsco.com/research-starters/history/toys-and-games-1990s/)
- [History](https://www.history.com/articles/10-christmas-toys-through-the-decades)
- [Associated Press / KRGV](https://www.krgv.com/news/grumpy-cat-who-entertained-millions-online-dies-at-age-7/)
- [Музыкальный вестник — interview](https://www.muzvest.narod.ru/15/skryabin.html)
- [NaKolei](https://www.nakolei.pl/koszmar-pasazerow-a-minister-bienkowska-sorry-mamy-taki-klimat/)
- [Olympedia](https://www.olympedia.org/editions)
- [Українські пісні — album track list](https://www.pisni.org.ua/albums/80.html)
- [Українські пісні](https://www.pisni.org.ua/persons/175.html)
- [Radio Free Europe / Radio Liberty](https://www.radiosvoboda.org/a/istorychna-svoboda-10-rokiv-tomu-yak-posypalysya-rehionaly-i-vtikav-yanukovych/32830987.html)
- [Reuters](https://www.reuters.com/world/kabosu-face-cryptocurrency-dogecoin-dies-18-owner-says-2024-05-24/)
- [Київський Рок-клуб](https://www.rock.ua/article/2008/341/)
- [Evening Standard](https://www.standard.co.uk/culture/music/rick-astley-rickrolling-foo-fighters-the-smiths-blossoms-interview-b1117436.html)
- [The Guardian](https://www.theguardian.com/lifeandstyle/2019/nov/08/experience-hide-the-pain-harold-face-became-meme-turned-it-into-career)
- [NPR / WBUR](https://www.wbur.org/npr/1151624434/a-decade-on-the-creator-of-this-is-fine-wants-to-put-the-famous-dog-to-rest)
- [WIRED — interview with photographer](https://www.wired.com/story/distracted-boyfriend-meme-photographer-interview)
