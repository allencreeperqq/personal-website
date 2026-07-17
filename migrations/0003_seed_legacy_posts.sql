-- 一次性資料匯入：把 blog/posts/*.md 的既有文章搬進 D1 posts 表。
-- 圖片／PDF 仍是靜態檔案（保留在 blog/posts/ 底下的子資料夾），內文裡的相對路徑
-- 已改寫成從網站根目錄開始的絕對路徑（/blog/posts/...），所以搬進資料庫渲染時一樣能正確載入。

INSERT INTO posts (slug, title, category, excerpt, content, status, created_at, updated_at, published_at) VALUES ('2026-03-23-first-post', '歡迎來到我的BLOG on GITHUB pages', '生活', '哈哈大家好! 歡迎來到我的BLOG', '# 第一篇文章

- 完成個人網站首頁結構
- 新增 Blog 資料夾與 Markdown 流程
- 測試固定格式輸出', 'published', '2026-03-23T00:00:00.000Z', '2026-03-23T00:00:00.000Z', '2026-03-23T00:00:00.000Z');
INSERT INTO posts (slug, title, category, excerpt, content, status, created_at, updated_at, published_at) VALUES ('2026-01-10-renpy-and-c-terminal', '基於rlutil之劇情遊戲設計與Ren''py之比較', '學習', '電機系大一計算機概論期末專題報告!', '## 基於rlutil之劇情遊戲設計與Ren''py之比較

>*中原大學 電機工程學系 電機一甲11428109 潘宇綸 製作*

---
### 一、前言
在期末專題構想中，我想要製作一個基於rlutil標頭檔的terminal小劇情遊戲，並且用已經嘗試過的fstream進行輸入輸出流，讀取文本檔案與角色立繪。先講解一下這次的研究過程。

1. 設定main程式的文件流讀取
2. 設定main程式的terminal更新(遊戲畫面) -> 接近於game loop的感覺
3. 設定劇情文本的standard
4. 設定角色立繪
5. 設定遊戲劇情
   
這次遊戲大約抓3~5分鐘的時間，因為AI可以加入進行程式設計，所以節省了許多時間，包含最困難的遊戲劇情設計，都是AI幫忙生成的。整體在C++設計時間大約為1\~2個小時。但是若是提到包含遊戲劇情重新設計在內，整體時長大約3小時左右。在研究過程中，因為使用terminal輸出ASCII code立繪真的太醜了，所以我突然想到在高中時期，那時候跟朋友的遊戲計畫，曾經有提及過Ren''py的劇情遊戲向引擎，所以我想要基於同樣的文本故事，在Ren''py上面也試試看，順便複習一下國中之後就沒有再碰過的python。

---
### 二、研究設備

> 使用軟體程式
> 1. rlutil.h in C++
> 2. Ren''py ver8.5.2 (in VScode)
> 3. vitual studio code 
> 4. Gemini pro / github copilot in VScode
>
>使用之素材
> 1. きまぐれアフター背景素材置き場 (背景フリー素材 通学路/ 學校)
> 2. 立ち絵素材　わたおきば 
>  *所有素材遊戲圖片立繪素材皆符合作者之無料使用規定*
>
---
### 三、基於Rlutil之劇情遊戲

#### 1. 整體架構

> ├─0110 final project_rlutil game
> &emsp;&emsp;&emsp;│      .gitignore.txt
> &emsp;&emsp;&emsp;│      charac_1.txt
> &emsp;&emsp;&emsp;│      charac_2.txt
> &emsp;&emsp;&emsp;│      hw.md
> &emsp;&emsp;&emsp;│      main.cpp
> &emsp;&emsp;&emsp;│      main.exe
> &emsp;&emsp;&emsp;│      rlutil.h
> &emsp;&emsp;&emsp;│      stories.txt
> &emsp;&emsp;&emsp;│      更改紀錄.txt
> &emsp;&emsp;&emsp;│
>
>使用tree/f/a生成
>所有檔案會附帶在github，詳見附錄

說明: 
1. charac_1&2 為角色立繪之ASCII儲存文字檔
2. main.cpp 為主程式
3. rlutil.h 是主要標頭
4. stories 是儲存文本劇情的地方
5. 更改紀錄 是AI儲存編輯紀錄的地方
6. .gitignore 是讓git不要上傳奇怪東西的檔案

#### 2. 主程式架構

我將此程式分為三個架構，其一為立繪讀取函數，其二為文本讀取函數，其三為遊戲主邏輯(即顯示terminal的主要場所)。立繪讀取函數包含了fstream流的讀入，並且對其上色，之後再使用if函數將ASCII輸出到螢幕上。文本讀取函數一樣使用fstream流把文本讀入，並且遵照我所設定的文本standard判斷每一句話的意義是什麼。

> 
>[SCENE_1]
>ART:charac_1.txt
>TEXT: 放學後的校舍，沈浸在一片橘紅色的逢魔時刻中。
>TEXT: 教室裡只有你們兩個人。
>TEXT: 小唯坐在講桌上，雙腿懸空晃盪，鞋跟敲擊桌腳發出規律的聲響。
>TEXT: 「學長...你終於忙完了？我都等得不耐煩了。」
>OPT: 2: 抱歉，學生會資料太多了 (溫柔)
>OPT: 3: 怎麼？等不及了嗎？ (調戲)
>

根據上面的一段範例，第一行的[scene_1]要求了以下開始，為第一段場景，而第二行的ART則是要求回傳冒號後面的檔案名稱給立繪讀取器，也就是他設定了整個場景要使用的立繪。而以TEXT為首的行，要求儲存冒號以後的中文字給遊戲主邏輯，並且作為文本劇情輸出到螢幕上。最後的OPT是指定的下一個場景選項，也就是要求遊戲主程式對使用者進行輸入要求，以上面的範例為例，若輸入數字1(此指相對的第一個選項)「抱歉，學生會資料太多了(溫柔)」，則會跳到[scene_2]場景，若玩家選擇輸入2，則會跳到場景3。注意，所有的文字文本因為中文在terminal支援度的問題，所以要從UTF-8轉為ANSI才得以執行。

遊戲主邏輯的工作則是儲存上一個場景、清除螢幕、負責輸出文本、顯示遊戲標題、視窗名稱、劇情文字的打字機效果、以及每次都會出現選項給玩家選擇。除此之虞，我還在遊戲中增加了幾個選項，包含離開遊戲、回到上一個場景等函數，這樣比較接近現實中遊玩的體驗。

這是一個簡單的小程式，我們看一下結果。

>遊戲體驗影片連結 > https://youtu.be/hlE6M_M2IH8
>(以下圖片上傳至imgbb，若無法正常顯示請參考附錄pdf或是影片)

![圖一](https://i.ibb.co/RTPYQZwN/2026-01-11-182624.png)

上面是場景一的圖片，也就是我放在上面的文本範例，旁邊的ASCII code立繪是charac_1.txt中的結果，可以看到上面明確的顯示劇情文本(他是有打字機效果的，可以看影片)，以及兩個選項，還有底下用格線分開的遊戲選項。

![圖二](https://i.ibb.co/dsZLd2PL/2026-01-11-183226.png)

這段是其中一個結局，並且使用charac_2的立繪。

---
### 四、Ren''py製作

#### 1. Ren''py介紹
Ren''py是一個開源的視覺小說遊戲引擎，操作直覺簡單，相較C++也比較好上手，並且網路資源及社群廣大，適合新手製作。

![圖三](https://www.renpy.org/static/6.99.11.jpg)

#### 2. 使用Ren''py製作相同劇情的遊戲
這次使用Ren''py是因為，單純做基於Rlutil的小遊戲感覺太過於簡單(畢竟可以使用AI，那麼做一個這樣的terminal遊戲只要一兩個小時就可以結束了)，所以我想要碰碰看之前曾經有想要玩的Ren''py。一開始還設想要用Unity來做，後來想想，我開始做這份作業的時候已經週六了，週日就是deadline，似乎不能這麼亂搞，所以選擇了Ren''py作為研究的比較項目。Ren''py在編輯時，因為只是很小的專案，並沒有商業價值，並且時間不多，所以很單純的只有編輯到script.rpy，以及images的file而已，而其餘像是screen.rpy、option.rpy等檔案就只是撇一眼過去而已，等到有一天很閒，真的有資本可以做自己的遊戲時，再嘗試看看。
來看看Ren''py中的script.rpy檔案吧。

![圖四](https://i.ibb.co/mVnrJwQ4/2026-01-11-184615.png)
最上方的define 與C++幾乎相同，不過他是去簡寫角色的代稱。

從init開始，他要求的是去設定起始函數，用$來賦值(這個方法不確定是基於甚麼語言，因為我在linux上面以及之前在寫BVE地圖的時候，也有出現過這樣的賦值符號)，這邊\$ pos是要求設定一個標轉的position給角色立繪，這個應該很好理解，如果我要求在某個文本下，角色要到一個會一直重複的位置，那麼用這個方法會比較好操作。

下一段的label start: 要求開始遊戲，在ren''py的script文件中，若要文本開始，則其label必須要是start，就像是C++的main函數一樣，而他的好處就是，C中的function要提前define，而這裡的label則不需要，你可以定義任何的名字給他。

20行出現scene函數，他要求了場景的變換，並且，附加的是整體其他的圖層也會重新整理，這邊後面加上了指定詞bg，呼叫images裡面的bg afternoon.png作為back ground圖層，有趣的是，若要要求圖片作為bg，則他在images檔案中的名稱也需要加上bg。

22行到第24行，為未指定角色文字，單純用雙引號就是當作旁白使用，可以見影片描述。

最後的show函數，則是要求images裡面的立繪檔案出現。並且可以指定位置、是否要zoom in、怎麼出現等，不過那都是更進階的內容了。

而這邊礙於篇幅關係，沒有提到menu及jump，不過在script文本中我有使用到，還請觀看影片。

#### 3. 遊戲的畫面

![圖五](https://i.ibb.co/m5vtKb6C/2026-01-11-185736.png)

這邊可以看到，相較C++的terminal，整體活靈活現的，真是感動。裡面的所有圖片包含立繪，都是我去日本的免費素材網站下載的，全部都符合使用規範(畢竟是基於教學用途(?))，可以看到，裡面的文字會自動的對準並且出現，下面的遊戲設定(歷史、反回、auto等)都是引擎自己附帶的，可以省下很多編輯的時間。

---

### 五、心得與成果

#### 1. C++的terminal遊戲與Ren''py對比
基於Rlutil對我來說是一個新的發現，畢竟竟然把以前高中曾經苦惱過的一個問題解決了(那時候還沒有甚麼很方便的AI輔助工具，詳見我的期末計畫預想)，Rlutil算是解決了刷新terminal、改變顏色、輸入等比較複雜的問題，不過，我認為若是做一些小專案還可以接受，不過若是提到實用性及可讀性來講，我認為Rlutil還是有許多可以被取代的地方，例如這次做的專案，應該沒有人像我一樣傻到來做劇情視覺小說遊戲，大家都是開Ren''py或是直接unity，甚至UE來做了，不過也藉由這次機會，我除了可以學到Rlutil的內容，還讓我自己去學了以前就想要試試看的Ren''py，讓我學到許多的東西，也離自己開發這種小遊戲的目標越來越近，雖然可能一切都是空談(因為我懶)，但是做完之後，確實相較起來，比較有實感了。

#### 2.心得
至於為什麼我想要做視覺遊戲呢?因為視覺遊戲相較起來，不需要甚麼物理引擎、不需要考慮敵人要會開槍、攻擊，不需要考慮自身的連續走位，視覺小說遊戲的美，就是基於用一連串的文字，以及美麗的繪畫風格，傳遞感人的故事，這樣子簡單的美，我認為勝過暴力、激鬥、打殺遊戲，當然，我也玩那些遊戲，不過，如果能夠用文字就可以傳達自己的想法，那麼，我認為最直接且最方便的，就是視覺小說遊戲了。自己國中就玩過Nekopara、高中玩過AOKANA、summerpocket、柚子社的許多遊戲，很多次都被這些遊戲感動，所以，想要藉由這次機會來製作一個這樣的小遊戲，雖然僅僅一分鐘的劇情不能表達甚麼，不過這也代表著遊戲製作有著的無窮潛力。希望未來有一天，我能夠了解更多，這方面的產業及遊戲製作等技術。

#### 3.未來展望
希望未來可以選修有關unity的課程，同時也對計算機架構也很有興趣，如果有一天能夠學到有關於網路及資安那就更好了。

---
### 附錄

成果展示 :   https://youtu.be/hlE6M_M2IH8
Github  :   https://github.com/allencreeperqq/rlutil.h-game.git', 'published', '2026-01-10T00:00:00.000Z', '2026-01-10T00:00:00.000Z', '2026-01-10T00:00:00.000Z');
INSERT INTO posts (slug, title, category, excerpt, content, status, created_at, updated_at, published_at) VALUES ('2026-03-23-japan-travel-2025', '2025年夏天日本高中畢業旅行自編計畫書', '旅行', '2025年高中畢業旅行 日本自助13天', '!pdf[2025日本行 去個資版本](/blog/posts/pdf%20file/2025日本行%20去個資版本.pdf)', 'published', '2026-03-23T00:00:00.000Z', '2026-03-23T00:00:00.000Z', '2026-03-23T00:00:00.000Z');
INSERT INTO posts (slug, title, category, excerpt, content, status, created_at, updated_at, published_at) VALUES ('2026-03-23-homemade-nas', '在家自製的NAS，可不可以從外地連? 詳細解決方法!', '學習', '在家使用trueNAS建置自己私網域的NAS後，是否可以從外地連入呢?', '很多人會在自家自行架設NAS等設施，尤其是當自己家裏面有一台舊主機，
拿來進行廢物利用，也是一種浪漫!

而身為一位一直把舊電腦玩弄於股掌之間(然後壞掉)的人，怎麼可以放過這
次的機會呢?這次我想要試試看，在嘉義架設一台NAS，在開學後，我到中壢
來讀書時，是否可以成功從宿舍存取我的檔案資料呢?

> 研究目的:在遠端存取資源，也有比較大的空間可以儲存資料，更重要的是，好玩!

### 硬體
> AMD Phenom(tm) II X4 850 Processor
> DDR3 16G RAM
> 1 TB * 2 HDD storage

### 軟體
> TrueNAS ver. 25.04.2.3

## 說明

> 1. 原先這台電腦在暑假的時候是作為Minecraft Mod Server，系統嘗試使用
> ubuntu系統，並在那時候已經使用其他舊電腦使用samba方法與主力機傳輸資
> 料，因為朋友都去讀大學，不然就是偷交女朋友，沒有人要玩了，就把server關
> 掉，將他的ssd灌入trueNAS系統並另外加上兩顆1TB的HDD，因為從國小就開
> 始維修電腦等，所以這部分算是簡單。 

> 2. 最困難的部分是，自己使用linux的command等指令才兩個月，所以在這段時間
> ，如有要debug的部分，大部分都是參考AI或是stackoverflow上的資料。 

> 3. 灌好TrueNAS後，我預計使用傳統windows的老朋友samba做檔案分享，不過
> NAS畢竟只是一個依附於內部網路的一個儲存位置，沒有辦法從外部網路連線
> ，我在參考許多資料後，使用tailscale VPN進行連線，透過P2P的連線，應該就
> 能解決外網連線問題。

> 4. 進入TrueNAS後，設定我想要的pool，將兩顆1TB driver加入pool裡面，這邊不
> 考慮使用其他Raid方式(也就是腦袋撞到的RAID 0 )，不過實驗性質大於工作
> 性質，故不在意那麼多。(結至2025/12/1，目前其中一顆硬碟已經報錯哈哈) 

> 5. 設定完pool後，確定2TB(事實上是1.7多TB)空間，並創建子目錄smb來為之後
> samba系統做準備。


!["示意圖"](/blog/posts/2026-03-23-homemade NAS pic/1.png)

> 6. 建置完成後，我先使用windows主力機用samba連線NAS，成功後，在TrueNAS
> 內的APP功能安裝tailscaleVPN

> 7. 在tailscale網站上建立token並激活trueNAS及local端的連線後，再次測試
> samba也可使用，到這裡就算完成了，目前無聊的時候還是會上去看一下，或
> 是備份一些資料到NAS上，不過因為這台機器不知道甚麼時候會死機，內部安
> 裝的HDD也非NAS專用硬碟，24小時運作感覺資料的安全性並不能保證。等暑
> 假有時間再回去排錯吧~note:如果使用VPN連線到內網NAS，應使用VPN給定
> 的新IP連入。

!["示意圖2"](/blog/posts/2026-03-23-homemade NAS pic/2.png)

>> 補充:
>> 之後在使用虛擬機跑linux系統時，曾經想要試試看是否能在虛擬機內部連入遠在
>> 嘉義的trueNAS系統，在使用token並且更新連線位置之後，成功在虛擬機內部使用NAS系統。
>> 有趣的是，我使用NAS內的flac檔案(因為本地端的硬碟夠大，所以沒有太大的NAS需求，NAS僅
>> 作為實驗用途，內部大部分都是存放flac音訊檔及torrent下來的東西)，使用VLC開源去撥放，
>> 音訊斷斷續續，從無損壓縮檔案直接升級成超損解壓檔案，後來判斷應該是因為虛擬機以及本地
>> 端的音訊連結本來就不是完全同步，這也許與CPU的處理時序有關，加上本地端我使用藍芽耳機，
>> 虛擬機的音訊藉由虛擬機配合CPU輸出到本地端的音訊之後，再轉換成藍芽過程，有許多無法完全
>> 配合的地方，加上當下無法測試有線耳機，所以這件事就不了了之。


>> 現況更新:
>> 因為家庭需求，目前這台機器已經被重灌並且作為一般家用主機使用。', 'published', '2026-03-23T00:00:00.000Z', '2026-03-23T00:00:00.000Z', '2026-03-23T00:00:00.000Z');
INSERT INTO posts (slug, title, category, excerpt, content, status, created_at, updated_at, published_at) VALUES ('2026-03-23-sorting-and-search', '使用Vibe Coding編寫一個基本演算法教學網站', '學習', '內含搜尋法、排序法的資源!', '前往網站: https://allencreeperqq.github.io/searching-and-sorting-website/index.html', 'published', '2026-03-23T00:00:00.000Z', '2026-03-23T00:00:00.000Z', '2026-03-23T00:00:00.000Z');
INSERT INTO posts (slug, title, category, excerpt, content, status, created_at, updated_at, published_at) VALUES ('2026-04-11-complexity', '排序演算法及其複雜度實驗研究報告', '學習', '電機系大一計算機概論期中專題報告!', '### 這個是作為大一電機工程學系計算機概論作業
### 網址: https://allencreeperqq.github.io/searching-and-sorting-website/index.html

---

## 排序演算法及其複雜度實驗研究報告
> 作者 CYEE 中原大學 電機一甲 潘宇綸 


### 。前言
本次研究主題為排序演算法與論其複雜度，並透過實驗驗證其時間、空間複雜度的理論。這個報告包含了五種演算法的介紹、程式碼、複雜度探討、複雜度實驗、實驗結論及一個可以讓新手及時學習的演算法學習網站。此實驗將會使用C++作為主要驗證語言，討論氣泡排序法(Bubble sort)、選擇排序法(Select sort)、插入排序法(Insertion sort)、快速排序法(Quick sort)、合併排序法(Merge sort)。結論會加上五種排序法之間的相互比較，並且羅列出所有的程式碼及資料。後會將此更新到我的個人部落格及本研究之附屬網站。

### 。研究方法及名詞解釋
本次研究我使用C++作為主要研究工具，先學習複雜度理論，來推測排序法的複雜度，並且使用程式驗證，並導入AI協作，將成果放到專案網站上。

> 研究工具
> 1. Visual Studio Code with COPILOT AI
> 2. Gemini 3 PRO
> 3. C++ gcc ver.15.2.0
>  

1. 時間複雜度(Time Complexity): 指的是一個程式隨著輸入資料量n的增加，其執行步驟次數的增長趨勢。以記法big O表示O(n)。常見的複雜度有O(1)即常數時間，無論資料n多大，其運行時間與資料量n無關。O(log(n))代表對數時間關係，當吃資料量n增加一倍，則其時間增加一點。隨之還有更大的O(N^2)等非線性複雜度。
2. 空間複雜度(Space complexity): 指的是衡量演算法執行過程中，額外占用記憶體空間隨資料量n增長的變化。記法依然使用big O notation，其中資料量n也可以影響其時間複雜度，也就是兩種複雜度是主要演算法的效能權衡指標。例如我要求一個矩陣arr二維陣列具有資料量n，則經過演算法進行轉置矩陣transfer matrix，並定義為新的結果陣列arr''，則其儲存的資料量為O(n)，不過正確來說，應該是對於輔助空間複雜度(Auxiliary space complexity)為O(n)，因為演算法多要求了一個儲存結果函數的2-order array。

### 。演算法及其複雜度
一、選擇排序法(Select sort)

選擇排序法(Select sort)是一種非常常見用於教學的演算法之一，其核心想法是將資料區分為排序區間與未排序區間，找尋未排序區間內的最小值，找到後將最小值放到未排序區最前面。

![圖片一](https://www.programiz.com/sites/tutorial2program/files/Selection-sort-0.png)

在上圖的範例中，有五筆資料，首先index先掃過未排序區(例圖為初始狀態 共五筆資料的未排序區)找出最小值，並且將最小的值(2)移動到未排序區的最左邊，此時index 1為已排序區。

![圖片二](https://www.programiz.com/sites/tutorial2program/files/Selection-sort-1.png)

第二次的排序如上圖顯示，因為2已經是已排序的整體最小值，所以不需要再對它進行比較，從index=2開始進行最小值比較。依此類推，每次都需要掃過一輪的未排序區，整體演算法耗時效率低，不過其算法十分直觀。

了解了Select sort的背景後，我們可以來探討背後的時間、空間複雜度了。

```c++
for (int i = 0; i < n - 1; i++) {
    int minIndex = i;
    // 內層迴圈：在未排序區間尋找最小值
    for (int j = i + 1; j < n; j++) {
        if (arr[j] < arr[minIndex]) {
            minIndex = j;
        }
    }
    // 交換元素
    swap(arr[i], arr[minIndex]);
}
```

上面是基於C++的select sort範例，我們假設有資料n筆，當層迴圈i=0時，則未排序區(內層)需要比較資料n-1次(此時第一筆index作為基準，比較量是一對一)，當i=2(也就是第二次搜尋)將需要比較資料n-2次...依此類推，將所有可能的比較全部加在一起。

$T(n) = (n-1)+(n-2)+...+2+1 = n(n-1)/2 $ 

將其展開

$T(n) = 1/2 n^2 - 1/2 n$

$deg(T(n)) = 2$ ， $big O(n^2)$

在此分析中，其最佳或是最差的情況，都需要使用$ O(n^2)$的時間複雜度來處理任意的排序，因為無論資料量大小，它都需要處裡資料量約$ n^2$次的搜尋。

而它的空間複雜度因為不需要使用額外配置的變數，所以其輔助空間複雜度O(1)。

---
二、氣泡排序法(Bubble sort)
氣泡排序法，也是一個常見的演算法，它的核心在於從index = 0開始重複兩兩比較記憶體位置大小，例如i=n與i=n+1之間的大小，若i=n+1小於i=n則交換，這樣不停的兩兩比較，直到一整輪的比較都沒有交換(即兩兩比較後的大小皆合理、全部都排完)則跳出迴圈終止程式。

![圖片三](https://miro.medium.com/v2/resize:fit:1100/format:webp/1*c9Jd30uPvUHiVwTkamK1MA.png)

而氣泡排序法與選擇排序法最大的部分，就是他可以有最優條件(即提早排完結束程式)，所以可以拆開來討論。

```c++
for (int i = 0; i < n - 1; i++) {
    bool swapped = false; // 紀錄這一輪是否有發生交換
    
    // 內層迴圈：每一次都會把當下最大的元素推到未排序區間的最後面
    for (int j = 0; j < n - i - 1; j++) {
        if (arr[j] > arr[j + 1]) {
            swap(arr[j], arr[j + 1]);
            swapped = true;
        }
    }
    
    // 如果這一輪完全沒有發生任何交換，代表陣列已經排序完成，直接結束
    if (!swapped) {
        break;
    }
}
```
我們先來預想最佳的情況:如果陣列一開始就已經完全排好，則我只需要花費一輪的時間，把整個全部n筆資料全部一對一的比較過，然後會發現沒有swap(不需要排序了)則會退出，所以在這個情況下，給定資料量n，整筆演算法所需要花費的走訪是n-1次，所以取degree就是 $O(n)$。
若討論到最差的情況:如果一個陣列完全反向排列(由大到小排列)時，則每一次都需要進行交換，且永遠不會提早結束。若給定資料量n，則它需要與選擇排序法相同的時間:
$T(n) = (n-1)+(n-2)+...+2+1 = n(n-1)/2 $ 

將其展開

$T(n) = 1/2 n^2 - 1/2 n$

$deg(T(n)) = 2$ ， $big O(n^2)$


所以其最佳的時間複雜度為$ O(n)$，最差為$ O(n^2)$。

而論其空間複雜度，因為與選擇排序相同，故只需要O(1)的空間複雜度。

---
三、插入排序法(Insertion sort)
插入排序法的想法與選擇排序類似，將一筆資料區分為已排序與未排序區，從未排序區選擇一個元素資料，將他比較後，插入已經排序的資料當中。
![圖片四](https://miro.medium.com/v2/resize:fit:720/format:webp/1*SmYUU9Gi3prZTOnbLP3_MA.png)

例如上圖，可以看到演算法將i=1視為已排列區域，並且從i=2(未排序區)開始比較已排序區域，依此類推。將目標元素(取出的未排序資料)與已排序資料進行依序比較，直到找到可以插入的位置。

```c++
for (int i = 1; i < n; i++) {
    int key = arr[i]; // 當前準備要插入的元素
    int j = i - 1;
    
    // 內層迴圈：在已排序區間由後往前掃描，尋找插入點
    // 如果前面的元素比 key 大，就把它們往後挪一個位置
    while (j >= 0 && arr[j] > key) {
        arr[j + 1] = arr[j];
        j--;
    }
    // 找到正確位置，將 key 插入
    arr[j + 1] = key;
}
```

不過這個演算法同氣泡排序法，有退出(break)條件，所以依樣有最佳狀況與最差狀況。

最佳情況下，當陣列一開始就是完全排序狀態(由小到大)，對於整個演算法來說，我只需要讓目標元素走訪所有的資料n即可，也就是比較n-1次。所以時間複雜度為$O(n)$。
最差情況，當陣列完全反向排序，每次目標元素必須要掃描全部的已排序區域，才會在最開頭插入，也就是當我的i=1時，需要搬動一次，i=2時需要搬動兩次...依此類推，i=n-1時需要n-1次。總合為:

$T(n) = 1 + 2 + 3+...+(n-1)=n(n-1)/2$

展開後 

$ deg(T(n)) = 2 $ ，時間複雜度$O(n^2)$

而此排序法依然無額外空間需求，所以空間複雜度依然為$O(1)$

---
四、合併排序法(Merge sort)
合併排序法的核心其實是先拆分再合併。合併排序法的主要思考模式是，將一筆資料進行切分，形成很多小的單位之後再慢慢排序合成一個大的陣列。

![圖片五](https://www.honeybadger.io/images/blog/posts/ruby-merge-sort/mergesort.png)

例如上圖，資料先被平分，再繼續切分下去，之後以小單位慢慢的組合排序，最後組合成一個完全體。

對半切的過程，假設有n筆資料，則這個向下延展的二元樹將會有$log_2(n)$層的資料(每次都除以二)，而合併過程中，因為n筆資料都被拆成n個小矩陣進行排序，所以需要共n次的走訪才能完成排序。將向下切分和重組的時間複雜度相乘就可以得到時間複雜度$O(nlogn)$。而因為合併排序法沒有所謂的最優情況和最糟情況，無論資料量和狀態都需要進行演算法，所以所有的情況時間複雜度都是$O(nlogn)$。

```c++
#include <iostream>
#include <vector>

// 合併兩個已排序的子陣列：arr[left...mid] 和 arr[mid+1...right]
void merge(std::vector<int>& arr, int left, int mid, int right) {
    int n1 = mid - left + 1; // 左半邊陣列的長度
    int n2 = right - mid;    // 右半邊陣列的長度

    // 建立暫存陣列 (這就是合併排序法空間複雜度為 O(n) 的原因)
    std::vector<int> L(n1);
    std::vector<int> R(n2);

    // 將資料複製到暫存陣列 L 和 R 中
    for (int i = 0; i < n1; i++)
        L[i] = arr[left + i];
    for (int j = 0; j < n2; j++)
        R[j] = arr[mid + 1 + j];

    // 使用雙指標來合併兩個暫存陣列
    int i = 0;       // L 陣列的指標
    int j = 0;       // R 陣列的指標
    int k = left;    // 原陣列 arr 的指標

    // 比較左右兩個陣列，將較小的數值依序放回原陣列
    while (i < n1 && j < n2) {
        // 注意：使用 <= 是為了確保「穩定排序 (Stable Sort)」
        // 當數值相同時，保留左半邊元素在前面的相對位置
        if (L[i] <= R[j]) {
            arr[k] = L[i];
            i++;
        } else {
            arr[k] = R[j];
            j++;
        }
        k++;
    }

    // 如果左半邊 L 還有剩餘元素，將它們全部放回 arr
    while (i < n1) {
        arr[k] = L[i];
        i++;
        k++;
    }

    // 如果右半邊 R 還有剩餘元素，將它們全部放回 arr
    while (j < n2) {
        arr[k] = R[j];
        j++;
        k++;
    }
}

// 分治法主程式：遞迴切割陣列
void mergeSort(std::vector<int>& arr, int left, int right) {
    // 遞迴終止條件：當子陣列長度為 1 或為空時停止
    if (left >= right) {
        return; 
    }

    // 計算中間索引值 (這寫法可以避免 left + right 造成整數溢位)
    int mid = left + (right - left) / 2;

    // 1. 遞迴對左半邊進行排序
    mergeSort(arr, left, mid);
    
    // 2. 遞迴對右半邊進行排序
    mergeSort(arr, mid + 1, right);

    // 3. 將左右兩個已排好序的半邊合併起來
    merge(arr, left, mid, right);
}

int main() {
    // 測試資料
    std::vector<int> arr = {38, 27, 43, 3, 9, 82, 10};

    std::cout << "排序前: ";
    for (int num : arr) {
        std::cout << num << " ";
    }
    std::cout << std::endl;

    // 呼叫合併排序法
    mergeSort(arr, 0, arr.size() - 1);

    std::cout << "排序後: ";
    for (int num : arr) {
        std::cout << num << " ";
    }
    std::cout << std::endl;

    return 0;
}
```

不過，既然時間複雜度有所下降(與其他排序法相論)，代表其空間複雜度可能有所改變，合併排序法的想法就是切分成更多的子矩陣，所以我們會要求一個新的陣列對要分割的元素進行暫存，最後再把這個新陣列的內容貼回原本的陣列。當我們演算法需要新的記憶體空間時，空間複雜度就可能變大。當具有資料n筆時，之後合併時需要的重組大小就是n筆，所以我們要向記憶體要求大小為資料大小的新記憶體空間n，則花費$O(n)$。並且這種有序的方法是使用遞迴的概念，所以遞迴需要使用系統呼叫堆疊消耗$O(logn)$的空間。

故總空間複雜度為$O(n)+O(logn) = O(n)$ 
假設具有1GB大小的需排序資料，則總共需要耗費大於2GB的記憶體空間。

---
五、快速排序法(Quick sort)
快速排序法類似於Merge sort合併排序法的架構，不過快速排序法不是單純的拆分陣列，而是決定一筆資料內的pivot，將整筆資料所有數值n與pivot比較後，區分成小於pivot與大於pivot的左右兩區域，之後在兩區域再次選出pivot，再進行一次。

![圖片六](https://ithelp.ithome.com.tw/upload/images/20211007/20121027Rj3YsKAi1Q.jpg)

```c++
#include <iostream>
#include <vector>

// 合併兩個已排序的子陣列：arr[left...mid] 和 arr[mid+1...right]
void merge(std::vector<int>& arr, int left, int mid, int right) {
    int n1 = mid - left + 1; // 左半邊陣列的長度
    int n2 = right - mid;    // 右半邊陣列的長度

    // 建立暫存陣列 (這就是合併排序法空間複雜度為 O(n) 的原因)
    std::vector<int> L(n1);
    std::vector<int> R(n2);

    // 將資料複製到暫存陣列 L 和 R 中
    for (int i = 0; i < n1; i++)
        L[i] = arr[left + i];
    for (int j = 0; j < n2; j++)
        R[j] = arr[mid + 1 + j];

    // 使用雙指標來合併兩個暫存陣列
    int i = 0;       // L 陣列的指標
    int j = 0;       // R 陣列的指標
    int k = left;    // 原陣列 arr 的指標

    // 比較左右兩個陣列，將較小的數值依序放回原陣列
    while (i < n1 && j < n2) {
        // 注意：使用 <= 是為了確保「穩定排序 (Stable Sort)」
        // 當數值相同時，保留左半邊元素在前面的相對位置
        if (L[i] <= R[j]) {
            arr[k] = L[i];
            i++;
        } else {
            arr[k] = R[j];
            j++;
        }
        k++;
    }

    // 如果左半邊 L 還有剩餘元素，將它們全部放回 arr
    while (i < n1) {
        arr[k] = L[i];
        i++;
        k++;
    }

    // 如果右半邊 R 還有剩餘元素，將它們全部放回 arr
    while (j < n2) {
        arr[k] = R[j];
        j++;
        k++;
    }
}

// 分治法主程式：遞迴切割陣列
void mergeSort(std::vector<int>& arr, int left, int right) {
    // 遞迴終止條件：當子陣列長度為 1 或為空時停止
    if (left >= right) {
        return; 
    }

    // 計算中間索引值 (這寫法可以避免 left + right 造成整數溢位)
    int mid = left + (right - left) / 2;

    // 1. 遞迴對左半邊進行排序
    mergeSort(arr, left, mid);
    
    // 2. 遞迴對右半邊進行排序
    mergeSort(arr, mid + 1, right);

    // 3. 將左右兩個已排好序的半邊合併起來
    merge(arr, left, mid, right);
}

int main() {
    // 測試資料
    std::vector<int> arr = {38, 27, 43, 3, 9, 82, 10};

    std::cout << "排序前: ";
    for (int num : arr) {
        std::cout << num << " ";
    }
    std::cout << std::endl;

    // 呼叫合併排序法
    mergeSort(arr, 0, arr.size() - 1);

    std::cout << "排序後: ";
    for (int num : arr) {
        std::cout << num << " ";
    }
    std::cout << std::endl;

    return 0;
}
```

若要討論時間複雜度，首先要看第一步，將整筆資料分為兩筆資料陣列，以pivot作為基準，需要走訪所有的資料n，所以時間上已經有了一個$O(n)$，並且再分割時，與merge sort一樣，需要進行遞迴，所以遞迴情況有$O(logn)$的時間複雜度。在最佳情況，也就是pivot剛好均勻的切分整筆資料，具有時間複雜度$O(nlogn)$，但若是pivot剛剛好選到整筆資料最大、或是最小的值，那第一次的切分將會沒有意義，因為所有的值都會集中在其中一邊，會完全浪費時間，這樣分完後，遞迴深度將會來到n層遞迴(也就是所有的元素都要進行排序)。這樣第一層掃描n次，第二層n-1次，依此類推，最差的時間複雜度將會是$O(n^2)$。平均而言，其時間複雜度為$O(nlogn)$。通常為了避免最糟糕的情況發生，會去優化選擇的pivot。

雖然不像是merge sort需要額外要求新的記憶體位置來暫時儲存那些資料，不過遞迴仍然需要使用新的記憶體堆疊空間。剛剛有提到，在最糟糕的情況下，遞迴的深度將會來到$O(n)$，不過在平均情況來講，當陣列只要非最差狀況，其空間複雜度為$O(logn)$。


### 實驗方法
一、使用C++結合AI協作寫一個程式，可以輸入資料大小n，並且要求這五種排序方法進行排序，後計算他所花費的電腦時間與記憶體空間，來計算固定n值下，演算法的複雜度。

二、透過輸入n不停放大，可以透過結果數據得到複雜度的關係，例如線性關係、指數關係等。

三、透過CSV輸出結果，並且記錄實驗數據待分析。

分析程式碼請見complexity test/sort_complexity_visualizer.cpp

>測資大小n
>$n_1 = 100$ 
>$n_2 = 500$
>$n_3 = 1000$
>$n_4 = 5000$
>$n_5 = 10000$
>$n_6 = 20000$
>$n_7 = 30000$
>$n_8 = 40000$
>$n_9 = 50000$
>
>亂數seed = 42

### 實驗結果

$n_1 = 100$ 

| n   | seed | algorithm | time_ms | comparisons | moves_or_swaps | peak_aux_bytes | theoretical_time             | theoretical_space  |
|-----|------|-----------|---------|-------------|----------------|----------------|------------------------------|--------------------|
| 100 | 42   | Bubble    | 0.0206  | 4935        | 2566           | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |
| 100 | 42   | Selection | 0.0102  | 4950        | 96             | 1              | Best/Avg/Worst O(n^2)        | O(1)               |
| 100 | 42   | Merge     | 0.025   | 535         | 1344           | 512            | Best/Avg/Worst O(n log n)    | O(n)               |
| 100 | 42   | Quick     | 0.003   | 680         | 398            | 832            | Avg O(n log n), Worst O(n^2) | Avg O(log n)       |
| 100 | 42   | Insertion | 0.0022  | 2658        | 2665           | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |

$n_2 = 500$

| n   | seed | algorithm | time_ms | comparisons | moves_or_swaps | peak_aux_bytes | theoretical_time             | theoretical_space  |
|-----|------|-----------|---------|-------------|----------------|----------------|------------------------------|--------------------|
| 500 | 42   | Bubble    | 0.4622  | 124560      | 58029          | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |
| 500 | 42   | Selection | 0.234   | 124750      | 491            | 1              | Best/Avg/Worst O(n^2)        | O(1)               |
| 500 | 42   | Merge     | 0.0776  | 3857        | 8976           | 2000           | Best/Avg/Worst O(n log n)    | O(n)               |
| 500 | 42   | Quick     | 0.0167  | 4988        | 3070           | 1152           | Avg O(n log n), Worst O(n^2) | Avg O(log n)       |
| 500 | 42   | Insertion | 0.0315  | 58520       | 58528          | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |

$n_3 = 1000$

| n    | seed | algorithm | time_ms | comparisons | moves_or_swaps | peak_aux_bytes | theoretical_time             | theoretical_space  |
|------|------|-----------|---------|-------------|----------------|----------------|------------------------------|--------------------|
| 1000 | 42   | Bubble    | 1.4878  | 497154      | 243217         | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |
| 1000 | 42   | Selection | 0.977   | 499500      | 991            | 1              | Best/Avg/Worst O(n^2)        | O(1)               |
| 1000 | 42   | Merge     | 0.1583  | 8690        | 19952          | 4000           | Best/Avg/Worst O(n log n)    | O(n)               |
| 1000 | 42   | Quick     | 0.0362  | 10549       | 6142           | 1344           | Avg O(n log n), Worst O(n^2) | Avg O(log n)       |
| 1000 | 42   | Insertion | 0.1234  | 244208      | 244216         | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |

$n_4 = 5000$

| n    | seed | algorithm | time_ms | comparisons | moves_or_swaps | peak_aux_bytes | theoretical_time             | theoretical_space  |
|------|------|-----------|---------|-------------|----------------|----------------|------------------------------|--------------------|
| 5000 | 42   | Bubble    | 41.533  | 12475972    | 6256255        | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |
| 5000 | 42   | Selection | 24.5759 | 12497500    | 4992           | 1              | Best/Avg/Worst O(n^2)        | O(1)               |
| 5000 | 42   | Merge     | 0.8134  | 55234       | 123616         | 20000          | Best/Avg/Worst O(n log n)    | O(n)               |
| 5000 | 42   | Quick     | 0.2178  | 68748       | 39550          | 1600           | Avg O(n log n), Worst O(n^2) | Avg O(log n)       |
| 5000 | 42   | Insertion | 3.1861  | 6261244     | 6261254        | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |

$n_5 = 10000$

| n     | seed | algorithm | time_ms  | comparisons | moves_or_swaps | peak_aux_bytes | theoretical_time             | theoretical_space  |
|-------|------|-----------|----------|-------------|----------------|----------------|------------------------------|--------------------|
| 10000 | 42   | Bubble    | 179.2474 | 49993404    | 25118412       | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |
| 10000 | 42   | Selection | 100.9564 | 49995000    | 9994           | 1              | Best/Avg/Worst O(n^2)        | O(1)               |
| 10000 | 42   | Merge     | 1.961    | 120465      | 267232         | 40000          | Best/Avg/Worst O(n log n)    | O(n)               |
| 10000 | 42   | Quick     | 0.6026   | 150915      | 76407          | 1920           | Avg O(n log n), Worst O(n^2) | Avg O(log n)       |
| 10000 | 42   | Insertion | 13.2185  | 25128399    | 25128411       | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |

$n_6 = 20000$

| n     | seed | algorithm | time_ms  | comparisons | moves_or_swaps | peak_aux_bytes | theoretical_time             | theoretical_space  |
|-------|------|-----------|----------|-------------|----------------|----------------|------------------------------|--------------------|
| 20000 | 42   | Bubble    | 776.0352 | 199986919   | 100387901      | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |
| 20000 | 42   | Selection | 391.1812 | 199990000   | 19991          | 1              | Best/Avg/Worst O(n^2)        | O(1)               |
| 20000 | 42   | Merge     | 3.5553   | 260840      | 574464         | 80000          | Best/Avg/Worst O(n log n)    | O(n)               |
| 20000 | 42   | Quick     | 1.3524   | 324134      | 174558         | 2048           | Avg O(n log n), Worst O(n^2) | Avg O(log n)       |
| 20000 | 42   | Insertion | 50.1906  | 100407888   | 100407900      | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |

$n_7 = 30000$

| n     | seed | algorithm | time_ms   | comparisons | moves_or_swaps | peak_aux_bytes | theoretical_time             | theoretical_space  |
|-------|------|-----------|-----------|-------------|----------------|----------------|------------------------------|--------------------|
| 30000 | 42   | Bubble    | 1777.7258 | 449902379   | 224630436      | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |
| 30000 | 42   | Selection | 896.2282  | 449985000   | 29992          | 1              | Best/Avg/Worst O(n^2)        | O(1)               |
| 30000 | 42   | Merge     | 5.3133    | 408567      | 894464         | 120000         | Best/Avg/Worst O(n log n)    | O(n)               |
| 30000 | 42   | Quick     | 1.5968    | 512203      | 274562         | 2112           | Avg O(n log n), Worst O(n^2) | Avg O(log n)       |
| 30000 | 42   | Insertion | 113.2289  | 224660423   | 224660435      | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |

$n_8 = 40000$

| n     | seed | algorithm | time_ms   | comparisons | moves_or_swaps | peak_aux_bytes | theoretical_time             | theoretical_space  |
|-------|------|-----------|-----------|-------------|----------------|----------------|------------------------------|--------------------|
| 40000 | 42   | Bubble    | 3186.7048 | 799947104   | 398882077      | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |
| 40000 | 42   | Selection | 1585.1296 | 799980000   | 39986          | 1              | Best/Avg/Worst O(n^2)        | O(1)               |
| 40000 | 42   | Merge     | 6.7472    | 561894      | 1228928        | 160000         | Best/Avg/Worst O(n log n)    | O(n)               |
| 40000 | 42   | Quick     | 2.0186    | 728923      | 376990         | 2304           | Avg O(n log n), Worst O(n^2) | Avg O(log n)       |
| 40000 | 42   | Insertion | 195.3869  | 398922063   | 398922076      | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |

$n_9 = 50000$

| n     | seed | algorithm | time_ms   | comparisons | moves_or_swaps | peak_aux_bytes | theoretical_time             | theoretical_space  |
|-------|------|-----------|-----------|-------------|----------------|----------------|------------------------------|--------------------|
| 50000 | 42   | Bubble    | 5032.5542 | 1249926172  | 621109975      | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |
| 50000 | 42   | Selection | 2497.4758 | 1249975000  | 49993          | 1              | Best/Avg/Worst O(n^2)        | O(1)               |
| 50000 | 42   | Merge     | 8.8559    | 718145      | 1568928        | 200000         | Best/Avg/Worst O(n log n)    | O(n)               |
| 50000 | 42   | Quick     | 2.7106    | 1024423     | 603964         | 2368           | Avg O(n log n), Worst O(n^2) | Avg O(log n)       |
| 50000 | 42   | Insertion | 307.4319  | 621159961   | 621159974      | 1              | Best O(n), Avg/Worst O(n^2)  | O(1)               |



### 結果探討

>表一、橫軸(資料n) 縱軸(ms)
![表格一](/blog/posts/2026-04-11-complexity/n-O(n).png)

>表二、merge sort 與 quick sort對比 橫軸(資料n) 縱軸(ms)
![表格二](/blog/posts/2026-04-11-complexity/mergevsquick.png)

從表一可以看到非常明顯的出現兩種族群，一種是積極上拋物線的$O(n^2)$組，一組是趨於平滑的水平$O(nlogn)$組。我們可以分析一下這兩組是否有達到預期的時間複雜度，以及是否驗證他的成長趨勢是指數級或一次級。

先論$bigO(n^2)$組別的內容，根據我們實驗前的分析，共有bubble sort、select sort、insertion sort等三個演算法是指數級的時間複雜度。我們先看bubble sort，氣泡排序法在資料$n_3 = 1000$時，所花費的時間結果為1.4878毫秒，在資料$n_8 = 50000$時，運行時間來到驚人的5032.55毫秒，已知中間的資料量倍數$n_8/n_3 = 50000/1000 = 50$倍，帶入預期時間複雜度$O(50^2)$為2500，也就是說，預期中，資料增長50倍，其運作的時間應該要差2500倍。我們透過$5032.55/1.4878$得到3390，也就是實際上，運作時間增長為3390倍。若論select sort與insertion sort，可以發現其時間在同樣的算法下，在$n_3 -> n_8$的時間增長分別為2555、2495倍，都非常接近2500倍的範圍。再來就是要討論，為何同為次方等級增長的bubble sort在這個實驗中會產生3390倍的增長。

於是我們單純對bubble sort再做一次的實驗。相同的$n_3 -> n_8$的範圍。得到1.777ms、4990.835ms，約為2808倍左右，所以證明，上面的一連串實驗對bubble sort應該有記憶體層面、運算層面因為多工等原因所以導致誤差，再次實驗後，證明氣泡排序法的時間複雜度在資料提升50倍的情況下，時間提升$50^2$倍約2500倍。

再論$bigO(nlogn)$組，也就是merge sort及quick sort，這兩個演算法同樣取$n_3 -> n_8$的資料範圍，資料50倍增長，merge sort再時間上增加了$8.85/0.158$，約增加56倍。我們帶入$nlogn = 50log50 = 84.95$，雖然中間顯有誤差，不過已經非常接近了，中間的誤差也可以歸納於硬體調度多工層面的影響。而quick sort來到75倍左右，非常接近我們的預測數值。

我們還有merge sort及quick sort的空間複雜度可以分析。看到peak_aux_bytes的欄位，merge在$n_8$顯示向硬體要求了200000的空間。而quick sort則是2368的空間。之前說到，merge因為需要一個完全等同資料量大小的額外空間，而已知一個C++的整數為4byte，資料量為50000，所以$50000*4 = 200000 byte$的空間，完全符合預期。看到quick sort，他的遞迴數值應該是$O(logn)$我們帶入得到15.6，所以這2368的空間拿來用於15層的遞迴運算。

我們得到以下結論:
1. merge sort and quick sort皆使用更多的記憶體來換去更快速的運行效率。
2. 實驗因為CPU、RAM的多工調度難免會有誤差，多做測試可以排除極端值。
3. merge sort與quick sort相比，需要花費更大的記憶體來完成，所以這就可以解釋為何許多人在競程時，常使用C++內建的quick sort完成排序。

### 心得與未來展望
這次的實驗以及網站架設過程都學到很多東西，以前會認為這些演算法都與自己無關，反正要用的時候，導入標頭使用quick sort就可以解決很多事情，透過實驗實際的看到電腦運行數據後，才理解為何許多人都在追求自己演算法的效率，當測資輸入大小大於萬時，電腦明顯的運行速度開始落後，這還要思考，並非每個人都具有相同的硬體可以快速運算出相同的答案，所以在軟體設計、演算法設計時，要去注意是否自己的優化可以讓大部分的使用者不花費太多記憶體效能下，也能達到服務。', 'published', '2026-04-11T00:00:00.000Z', '2026-04-11T00:00:00.000Z', '2026-04-11T00:00:00.000Z');
INSERT INTO posts (slug, title, category, excerpt, content, status, created_at, updated_at, published_at) VALUES ('2026-05-10-dynarr-and-memorys', '指標與陣列&記憶體配置', '作業', '這是一個平常作業的紀錄', '### 中原電機 計算機概論 作業 指標與陣列&記憶體配置
> 電機一甲 潘宇綸 0510

### 一、指標與陣列
題目: 電流陣列的反轉與搜尋

1. 程式碼

``` c
//0510 2026 - 指標與陣列作業
//電機一甲 潘宇綸

#include <iostream>
using namespace std;

void count_above(const float *ptr , int n , float threshold){ //計算大於十豪安的電流
    int count = 0;
    printf("current above 10.0 mA :");

    int frist = 0;

    for(int i = 0; i < n; i++){
        if(*(ptr + i) > threshold){
            printf("%.1f ", *(ptr + i)); //輸出超過閾值的電流值

            if(frist == 0){ //輸出第一個超過閾值的電流值的索引
                printf("(index: %d)  ", i);
                frist = 1;
            }

            count++;
        }
    }
    printf("\n");
}

void inverse(float *ptr , int n){ //反轉陣列
    printf("inverse current :");

    for(int i = 0; i < n / 2; i++){
        float temp = *(ptr + i);
        *(ptr + i) = *(ptr + n - 1 - i);
        *(ptr + n - 1 - i) = temp;
    }

    for(int i = 0; i < 8; i++){ //用指標列印反轉陣列
        printf("%.1f ", *(ptr + i));
    }
    printf("\n");

}

int main(){

    float current[8] = {12.5, 8.3, 15.1, 6.7, 18.4, 9.0, 14.2, 11.6};
    float *ptr = current;

    printf("original current :");
    for(int i = 0; i < 8; i++){ //用指標列印原始陣列
        printf("%.1f ", *(ptr + i));
    }
    printf("\n");

    float threshold = 10.0; //原始設定十毫安電流


    count_above(ptr, 8, threshold); //丟給函式計算大於十豪安的電流值
    inverse(ptr, 8); //丟給函式反轉陣列

    //因為再次反轉陣列沒有甚麼意義 所以不再呼叫一次inverse函式來反轉回原始陣列

    return 0;
}
```

輸出

```
original current :12.5 8.3 15.1 6.7 18.4 9.0 14.2 11.6 
current above 10.0 mA :12.5 (index: 0)  15.1 18.4 14.2 11.6 
inverse current :11.6 14.2 9.0 18.4 6.7 15.1 8.3 12.5 
```

2. 結論
   這個作業使用到了指標的許多觀念，以及在陣列中的應用。感覺觀念與之前所使用的陣列沒有太多的不同，在指標上的應用也不算太多，畢竟傳陣列指標與直接傳陣列沒有直接的不同，這個作業大約10分鐘內可以做完。中間沒有明顯遇到阻礙，只有設定編譯時使用C而非C++導致需要回去複習printf的使用。而驗證反轉沒錯這方面我沒有特別去做，因為資料量很小，基本上用眼睛可以看出他有反轉。



### 二、記憶體配置

1. 程式碼

``` c
#include <bits/stdc++.h>
using namespace std;

void stats(const float *arr, int n, float *avg, float *min, float *max){
    float sum = 0.0;
    *min = arr[0];
    *max = arr[0];

    for(int i = 0; i < n; i++){
        sum += arr[i]; //計算總和
        if(arr[i] < *min){ //找MIN
            *min = arr[i];
        }
        if(arr[i] > *max){ //找MAX
            *max = arr[i];
        }
    }

    *avg = sum / n;

    printf("Average: %.2f\n", *avg);
    printf("Maximum: %.2f\n", *max);
    printf("Minimum: %.2f\n", *min);

    printf("Elements above average: ");
    for(int i = 0 ; i< n ; i++){
        if(arr[i] > *avg){ //輸出大於平均值的元素
            printf("%.2f ", arr[i]);
        }
    }
    printf("\n");
}


int main (){
    int arrlen;
    scanf("%d", &arrlen); //輸入陣列大小

    if(arrlen <= 0){ //檢查陣列大小是否有效
        printf("Invalid array size\n");
        return 1;
    }

    float *arr = (float *)calloc(arrlen, sizeof(float)); //配置初始化動態陣列

    if(arr == NULL){ //檢查是否記憶體不足
        printf("Memory allocation failed\n");
        return 1;
    }

    for(int i = 0; i < arrlen; i++){
        scanf("%f", &arr[i]); //輸入陣列元素
    }

    float avg, min, max;
    stats((const float *)arr, arrlen, &avg, &min, &max);

    free(arr); //釋放動態陣列記憶體
    arr = NULL; //將指標設為NULL以避免懸空指標


    return 0;
}
```

輸入 
```
5
12 43 31 85 15 
```
輸出
```
Average: 37.20
Maximum: 85.00
Minimum: 12.00
Elements above average: 43.00 85.00 
```


2. 結論
   這個作業相對來講花費較多時間，因為之前沒有太多接觸動態記憶體跟陣列配置，所以花了點時間在網路上學習這方面的內容，發現在許多輸入及配置層面，有許多技巧跟安全防護需要去注意，例如使用者的輸入、配置的大小、檢查等。兩份作業的實際計算及內容並沒有太難，只是應用在新的技術上面，需要花比較多時間去進行學習。', 'published', '2026-05-10T00:00:00.000Z', '2026-05-10T00:00:00.000Z', '2026-05-10T00:00:00.000Z');
INSERT INTO posts (slug, title, category, excerpt, content, status, created_at, updated_at, published_at) VALUES ('2026-07-16-rvc-webui-1', 'RVC-WebUI的建置與測試', '專題', '為國科會專題計畫，操作RVC-WebUI的實作紀錄(一)。', '!pdf[RVC-WebUI測試記錄一](/blog/posts/pdf%20file/AI音樂及人聲研究-RVC-WebUI實作紀錄 0713.pdf)', 'published', '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z');
INSERT INTO posts (slug, title, category, excerpt, content, status, created_at, updated_at, published_at) VALUES ('2026-07-16-ai-ethics-ai-art-problem', 'AI倫理與AI文創帶來的問題與反思', '專題', 'AI創作為何造成爭議?AI創作是否會扼殺人類本質?AI又是否會取代藝術家?', '### AI倫理與AI文創帶來的問題與反思', 'published', '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z');
INSERT INTO posts (slug, title, category, excerpt, content, status, created_at, updated_at, published_at) VALUES ('2026-06-26-whats-codex-and-computer-use', '什麼是CODEX computer use? (計算機概論(二)、期末報告)', '專題', '嘗試使用CODEX進行開發，以及嘗試computer use並探討與agent之差異。', '## 蛤?什麼是codex computer use?
![cmputeruse](/blog/posts/2026-06-26-what''s%20codex%20and%20computer%20use/computeruse.png)
#### computer use簡單介紹
會憶起小時候，我家人常常會請數學、自然家教給我補習，當我為了一個圖形問題而拼命掙扎時，那些讀清大、成大的哥哥們總是會在些會後不耐煩的搶過我的位子，開始一步步地幫我推導公式...
也許現在正紅的computer use就是如此吧，當AI從文字輸入(chating)變成能夠直接看到你螢幕的AI助理時，會不會也有那種感覺呢?至少對我來說，當把電腦前景(及使用端畫面輸出)交給AI去判讀並使用座標化平面去操作鼠標時，就像是那時的高材生對上小屁孩一樣，有一種想要窺探其中祕密的感覺。
computer use即是一個AI視覺化的例子，AI會經過使用者授權後，取得螢幕前景的判讀權力，並接管目前的滑鼠使用(非強制性的，並且有立即跳脫機制)，缺點是他不像龍蝦一樣，養在一個封閉的sandbox，給他一點空間可以操作，就可以在背景、獨立的伺服器運作。

![computeruse2](/blog/posts/2026-06-26-what''s%20codex%20and%20computer%20use/computeruse2.png)

#### 我的想法

如果要我討論，他與龍蝦最大的不同點，我可能會提到「普及化」這個想法，當初龍蝦發表時，雖然算是震動資訊科學界一時，不過許多人跳出來不停的將「資訊安全」、「沙盒環境」、「安全風險」傳遞至各個角落，讓龍蝦的飼養隨著普羅大眾(及非本科領域)慢慢遠離先進AI agent實驗，雖然這是個好事(畢竟操作時具有專業知識及經驗更為安全)，不過會讓人思考一件重要的事情:何時AI agent會正式進入完全的普及化?
我認為computer use是一個點，雖然AI agent可以透過coding的輔助AI操控我們的資料結構、甚至去取得系統的某些重要資料，不過這離體感上的人工智慧助理仍有一段差距。當我們去設想，以往過年期間、放假期間，年輕人會到老家時，常常需要解決老人家的一些瑣碎操作問題，例如我曾經因為老人家不懂軟體操作，被家人煩過許多次，如果這時候，AI vision可以代替人類取代前景，並進行電腦的系統教育或是代為操作，是否也算是一種巨大的貢獻、以及AI agent的一大進步實作呢?

#### 一些好玩的實作

如果我想要要求他去我的steam裡面，並且查看我玩了多久的forza horizen 6呢?
![ccc](/blog/posts/2026-06-26-what''s%20codex%20and%20computer%20use/computeruse3.png)
prompt

![ddd](/blog/posts/2026-06-26-what''s%20codex%20and%20computer%20use/computeruse4.png)
前景被控制。可以看到上方有一排字【codex is using your computer, esc to cancel】以及屬標顯示光暈，背後的chat顯示AI正在思考，代表他正在擷取我的視窗訊息，並且判斷如何操作。

![eee](/blog/posts/2026-06-26-what''s%20codex%20and%20computer%20use/computeruse5.png)
可以看到，他已經自動的把鼠標移動到收藏夾，並且可以讀取到我目前的遊戲時數。

以上就是好玩的實作(一部分而已，非常抱歉我沒有開啟ost去錄影，因為那時候的測試來的太過突然，未來有機會願意再重新做一份報告來探討這個功能!)

#### 心得
其實非常的有趣，面對AI的這幾年，其實從未真正的想過，這個東西的未來會長甚麼樣子，是像知名遊戲stray一樣，每個類似人類的靈魂，其實都是機器人的實體，抑或是像哆啦A夢那樣，機器貓成為人類的朋友...無人知曉，如同量子力學般玄幻。
國中時，從未想過可以在沒有學過html的情況下寫網站，在沒有學深厚的後端理論的情況下搭建自己的homelab，不過在現在，似乎一切都是可能的，我會這樣講:當我們花錢去購買算力時，也許不是單純的token以及電力的交易，而是正在購買一場「機會」。
當我們把目光放到現在時，無論是內函及風險較高的龍蝦(及其他AI agent)，或是把chat無限放大的AI vision應用:computer use。人類似乎不停的在算了及人工智慧助理的邊緣不停的試探，究竟AI是一場泡沫或是更大的安全隱憂，可能連算力極強的AI都算不出來。
也許我們能做的，就是走在時代的前沿，試圖在AI的大浪中不要船沉。

## 感謝
非常感謝王佳盈老師在一年級的指導，學生受益良多。以及感謝這堂課的助教、研發人員們，你們不停的提升整體的教學品質，為了將來電機系的學生而付出許多。

我自國小就非常喜歡電腦相關的東西，原因也很簡單，因為我不能順跑麥塊。我開始不停的研究電腦組裝:記憶體、處理器、顯示卡...etc，不知不覺中，已經過了那麼久。國中時擔任學校的電腦維修志工，學到了bios、程式設計、簡單的系統概念、元件焊接...。到了高中，一心想讀資工的我碰到了競賽程式，宛如一場惡夢，我不喜歡用既定的題目來限制自己的想像力，我反而更嚮往那種永遠不會AC，但卻乘載理想的程式...。又在對於硬體的執著中，最後選擇了電機系。然而AI卻爆發了，正如我前面所說的，AI讓各種不可能變成可能，於是，在怎麼樣難的APCS題目，在AI工具前面，如同殺雞用牛刀般卑微。

也許一切的不可能在這個時代，都有可能因為摩爾定律或是AI的推進，而成為一個時代的塵埃。願未來的幾年，我們可以更了解自己，而將人性及道德作為我們並非AI而生而為人的價值。

先道歉，因為這次期末的壓力較大，加上上班時間會沖擠到自由應用時間，故此次專案並沒有太過於爭執於技術的革新或是討論。

謝謝老師邀請我進入您的計畫，也謝謝老師讓我有機會一窺bridgeAI的背後開發過程。未來我也會繼續努力。

這一年，非常感謝老師在計算機概論(一)、(二)的指導。



## 完

---
>聲明:本專題報告之內容、圖片具有個資，禁止任意非經同意的轉載，謝謝。
>使用AI agent請基於安全可控環境。本文許多錯字亂語是基於校驗時間不足，非常抱歉。

>AI Use Statement
a.本文架構皆為人工製作及審查，僅少數文字基於AI生成。
b.AI工具包含【Google Gemini / openAI chatGPT / openAI Codex / Copilot】
c.本文之(三) 子標題之''架構''、''功能''、''使用方式'' 目 為AI生成之版本紀錄移植。
d.本文資訊基於程式事實而陳述。若有問題或錯誤歡迎指教。
e.本文之架構文字屬於 中原電機11428109潘宇綸 及 計算機概論(二)2026/EE243A 所有。
f.本文為計算機概論期末報告，合理使用AI，所有工具僅用於教育用途。', 'published', '2026-06-26T00:00:00.000Z', '2026-06-26T00:00:00.000Z', '2026-06-26T00:00:00.000Z');
