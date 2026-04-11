---
title: 排序演算法及其複雜度實驗研究報告
date: 2026-04-11
category: 學習
excerpt: 電機系大一計算機概論期中專題報告!
---

### 這個是作為大一電機工程學系計算機概論作業
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
2. 空間複雜度(Space complexity): 指的是衡量演算法執行過程中，額外占用記憶體空間隨資料量n增長的變化。記法依然使用big O notation，其中資料量n也可以影響其時間複雜度，也就是兩種複雜度是主要演算法的效能權衡指標。例如我要求一個矩陣arr二維陣列具有資料量n，則經過演算法進行轉置矩陣transfer matrix，並定義為新的結果陣列arr'，則其儲存的資料量為O(n)，不過正確來說，應該是對於輔助空間複雜度(Auxiliary space complexity)為O(n)，因為演算法多要求了一個儲存結果函數的2-order array。

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
![表格一](2026-04-11-complexity\n-O(n).png)

>表二、merge sort 與 quick sort對比 橫軸(資料n) 縱軸(ms)
![表格二](2026-04-11-complexity\mergevsquick.png)

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
這次的實驗以及網站架設過程都學到很多東西，以前會認為這些演算法都與自己無關，反正要用的時候，導入標頭使用quick sort就可以解決很多事情，透過實驗實際的看到電腦運行數據後，才理解為何許多人都在追求自己演算法的效率，當測資輸入大小大於萬時，電腦明顯的運行速度開始落後，這還要思考，並非每個人都具有相同的硬體可以快速運算出相同的答案，所以在軟體設計、演算法設計時，要去注意是否自己的優化可以讓大部分的使用者不花費太多記憶體效能下，也能達到服務。


