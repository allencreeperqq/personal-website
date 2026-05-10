---
title: 指標與陣列&記憶體配置
date: 2026-05-10
category: 作業
excerpt: 無
---


### 中原電機 計算機概論 作業 指標與陣列&記憶體配置
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
   這個作業相對來講花費較多時間，因為之前沒有太多接觸動態記憶體跟陣列配置，所以花了點時間在網路上學習這方面的內容，發現在許多輸入及配置層面，有許多技巧跟安全防護需要去注意，例如使用者的輸入、配置的大小、檢查等。兩份作業的實際計算及內容並沒有太難，只是應用在新的技術上面，需要花比較多時間去進行學習。