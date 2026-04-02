// @ts-ignore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
// @ts-ignore
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

declare const window: any;
declare const Chart: any;

// !!! KENDI FIREBASE BILGILERINI BURAYA YAPIŞTIR !!!
const firebaseConfig = {
    apiKey: "AIzaSyD4EawjLsvNvGCv-Z8QcYQ4W79akKD5jko",
    authDomain: "notkayitsistemi-1abc7.firebaseapp.com",
    projectId: "notkayitsistemi-1abc7",
    storageBucket: "notkayitsistemi-1abc7.firebasestorage.app",
    messagingSenderId: "255928648563",
    appId: "1:255928648563:web:3e76028c48e92ab2f17b06"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let allStudents: any[] = [];
let barChartInstance: any = null;
let pieChartInstance: any = null;

const statsFilter = document.getElementById('statsFilter') as HTMLSelectElement;
const dynamicStatsContainer = document.getElementById('dynamicStatsContainer') as HTMLElement;
const btnExportStatsPDF = document.getElementById('btnExportStatsPDF') as HTMLButtonElement;
const chartsWrapper = document.getElementById('chartsWrapper') as HTMLElement;
const barChartTitle = document.getElementById('barChartTitle') as HTMLElement;
const pieChartTitle = document.getElementById('pieChartTitle') as HTMLElement;

async function loadDataAndInit() {
    try {
        dynamicStatsContainer.innerHTML = '<h3>Veriler hesaplanıyor...</h3>';
        chartsWrapper.style.visibility = 'hidden'; 

        const querySnapshot = await getDocs(collection(db, "ogrenci_notlari"));
        querySnapshot.forEach((doc: any) => allStudents.push(doc.data()));
        updateStatistics();
    } catch (error) {
        console.error("Veriler çekilirken hata:", error);
        dynamicStatsContainer.innerHTML = '<div class="card"><h3 style="color:red;">Veriler yüklenemedi.</h3></div>';
    }
}

statsFilter.addEventListener('change', updateStatistics);

function renderCharts(mainChartConfig: any, pieConfig: any) {
    const ctxBar = document.getElementById('barChart') as HTMLCanvasElement;
    const ctxPie = document.getElementById('pieChart') as HTMLCanvasElement;

    if (barChartInstance) barChartInstance.destroy();
    if (pieChartInstance) pieChartInstance.destroy();

    barChartInstance = new Chart(ctxBar, mainChartConfig);
    pieChartInstance = new Chart(ctxPie, pieConfig);
    
    chartsWrapper.style.visibility = 'visible';
}

function updateStatistics() {
    const selected = statsFilter.value; 
    dynamicStatsContainer.innerHTML = ''; 

    if (allStudents.length === 0) {
        dynamicStatsContainer.innerHTML = '<div class="card"><h3>Kayıtlı öğrenci bulunmuyor.</h3></div>';
        chartsWrapper.style.visibility = 'hidden';
        return;
    }

    if (selected === '5-all' || selected === '6-all') {
        renderGradeLevelStats(selected);
    } else {
        renderClassStats(selected);
    }
}

// =========================================================
// KADEME BAZLI İSTATİSTİKLER
// =========================================================
function renderGradeLevelStats(gradeLevel: string) {
    const gradePrefix = gradeLevel.split('-')[0];
    const filteredStudents = allStudents.filter(s => s.sinif && s.sinif.startsWith(gradePrefix));

    if (filteredStudents.length === 0) {
        dynamicStatsContainer.innerHTML = `<div class="card"><h3>Bu kademede henüz kayıt yok.</h3></div>`;
        chartsWrapper.style.visibility = 'hidden';
        return;
    }

    const scores = filteredStudents.map(s => s.toplam);
    const gradeAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    const pass50 = scores.filter(s => s >= 50).length;
    const fail50 = scores.filter(s => s < 50).length;
    const count100 = scores.filter(s => s === 100).length;
    const aboveAvg = scores.filter(s => s >= gradeAvg).length;
    const belowAvg = scores.filter(s => s < gradeAvg).length;

    const branchStats: any = {};
    filteredStudents.forEach(s => {
        if (!branchStats[s.sinif]) branchStats[s.sinif] = { total: 0, count: 0 };
        branchStats[s.sinif].total += s.toplam;
        branchStats[s.sinif].count++;
    });

    createCard("Kademe Ortalaması", `${gradeAvg.toFixed(1)}`, `Toplam ${filteredStudents.length} Öğrenci`);
    createCard("50 Puan Barajı", `${pass50} Geçti`, `${fail50} Öğrenci barajın altında kaldı`);
    createCard("Ortalama Barajı", `${aboveAvg} Üstünde`, `${belowAvg} Öğrenci ortalamanın altında`);
    createCard("100 Tam Puan", `${count100}`, `Kişi tam puan aldı`);

    const sortedBranches = Object.keys(branchStats).sort();
    const branchAverages: string[] = [];

    for (const branch of sortedBranches) {
        const avg = branchStats[branch].total / branchStats[branch].count;
        branchAverages.push(avg.toFixed(1));
        createCard(`${branch} Ortalaması`, `${avg.toFixed(1)}`, `${branchStats[branch].count} Öğrenci`);
    }

    barChartTitle.textContent = "Şube Ortalamaları Karşılaştırması";
    pieChartTitle.textContent = "50 Puan Barajı Dağılımı";

    const barConfig = {
        type: 'bar',
        data: {
            labels: sortedBranches,
            datasets: [{ label: 'Şube Puan Ortalaması', data: branchAverages, backgroundColor: '#3b82f6', borderRadius: 5 }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
    };

    const pieConfig = {
        type: 'doughnut',
        data: {
            labels: ['50 ve Üzeri (Geçti)', '50 Altı (Kaldı)'],
            datasets: [{ data: [pass50, fail50], backgroundColor: ['#10b981', '#ef4444'] }]
        },
        options: { responsive: true }
    };

    renderCharts(barConfig, pieConfig);
}

// =========================================================
// SINIF BAZLI İSTATİSTİKLER VE PUAN ARALIĞI GRAFİĞİ
// =========================================================
function renderClassStats(className: string) {
    const filteredStudents = allStudents.filter(s => s.sinif === className);

    if (filteredStudents.length === 0) {
        dynamicStatsContainer.innerHTML = `<div class="card"><h3>Bu şubede henüz kayıt yok.</h3></div>`;
        chartsWrapper.style.visibility = 'hidden';
        return;
    }

    const scores = filteredStudents.map(s => s.toplam);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const pass50 = scores.filter(s => s >= 50).length;
    const fail50 = scores.filter(s => s < 50).length;
    const count100 = scores.filter(s => s === 100).length;
    const aboveAvg = scores.filter(s => s >= avgScore).length;
    const belowAvg = scores.filter(s => s < avgScore).length;

    const lowestStudent = filteredStudents.find(s => s.toplam === minScore);

    const is6th = className.startsWith('6');
    const questionCount = is6th ? 6 : 5;
    
    const zeroCounts: any = { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0, s6: 0 };

    filteredStudents.forEach(s => {
        if (s.s1 === 0) zeroCounts.s1++;
        if (s.s2 === 0) zeroCounts.s2++;
        if (s.s3 === 0) zeroCounts.s3++;
        if (s.s4 === 0) zeroCounts.s4++;
        if (s.s5 === 0) zeroCounts.s5++;
        if (is6th && s.s6 === 0) zeroCounts.s6++;
    });

    let bestQ = "-";
    let minZeros = 99999; 
    let worstQ = "-";
    let maxZeros = -1;    

    for (let i = 1; i <= questionCount; i++) {
        const zeros = zeroCounts[`s${i}`];
        if (zeros < minZeros) { minZeros = zeros; bestQ = `Soru ${i}`; }
        if (zeros > maxZeros) { maxZeros = zeros; worstQ = `Soru ${i}`; }
    }

    createCard("Sınıf Ortalaması", `${avgScore.toFixed(1)}`, `Toplam ${filteredStudents.length} Öğrenci`);
    createCard("50 Puan Barajı", `${pass50} Geçti`, `${fail50} Öğrenci barajın altında kaldı`);
    createCard("Ortalama Barajı", `${aboveAvg} Üstünde`, `${belowAvg} Öğrenci ortalamanın altında`);
    createCard("100 Tam Puan", `${count100}`, `Öğrenci 100 tam puan aldı`);
    createCard("En Düşük Not", `${minScore}`, `Alan: ${lowestStudent?.adSoyad || 'Bilinmiyor'}`);
    createCard("En Çok Yapılan", `${bestQ}`, `0 Alan: Sadece ${minZeros} Öğrenci`);
    createCard("En Az Yapılan", `${worstQ}`, `0 Alan: Tam ${maxZeros} Öğrenci`);

    // --- YENİLİK BURADA: PUAN ARALIKLARINA GÖRE YIĞILMA GRAFİĞİ ---
    barChartTitle.textContent = "Sınıf Puan Yığılma Eğrisi (Aralıklı)";
    pieChartTitle.textContent = "Sınıf İçi 50 Puan Barajı";

    // Puan aralıklarını tanımla ve sayaçları sıfırla
    const rangeCounts = {
        "0-19 Puan": 0,
        "20-39 Puan": 0,
        "40-59 Puan": 0,
        "60-79 Puan": 0,
        "80-100 Puan": 0
    };

    // Öğrencilerin puanlarını aralıklara dağıt
    filteredStudents.forEach(s => {
        const score = s.toplam;
        if (score < 20) rangeCounts["0-19 Puan"]++;
        else if (score < 40) rangeCounts["20-39 Puan"]++;
        else if (score < 60) rangeCounts["40-59 Puan"]++;
        else if (score < 80) rangeCounts["60-79 Puan"]++;
        else rangeCounts["80-100 Puan"]++;
    });

    const scoreLabels = Object.keys(rangeCounts);
    const frequencies = Object.values(rangeCounts);

    const lineConfig = {
        type: 'line',
        data: {
            labels: scoreLabels,
            datasets: [{ 
                label: 'Öğrenci Sayısı', 
                data: frequencies, 
                borderColor: '#8b5cf6', 
                backgroundColor: 'rgba(139, 92, 246, 0.2)', 
                borderWidth: 2,
                fill: true,
                tension: 0.4, // Eğrinin yumuşak olmasını sağlar
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: '#ffffff',
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: { 
            responsive: true, 
            scales: { 
                y: { 
                    beginAtZero: true, 
                    ticks: { stepSize: 1 } // Kişi sayısı buçuklu olamayacağı için
                } 
            },
            plugins: {
                legend: { display: false },
                tooltip: { 
                    callbacks: { 
                        label: function(context: any) { 
                            return context.raw + ' Öğrenci bu aralıkta not aldı'; 
                        } 
                    } 
                }
            }
        } 
    };

    const pieConfig = {
        type: 'doughnut',
        data: {
            labels: ['50 ve Üzeri (Geçti)', '50 Altı (Kaldı)'],
            datasets: [{ data: [pass50, fail50], backgroundColor: ['#10b981', '#ef4444'] }]
        },
        options: { responsive: true }
    };

    renderCharts(lineConfig, pieConfig);
}

function createCard(title: string, value: string, subtitle: string) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <h3 class="card-title">${title}</h3>
        <div class="card-value" style="font-size: 1.8rem; color: #3b82f6;">${value}</div>
        <div class="card-subtitle" style="font-size: 0.85rem; color: #64748b; margin-top: 8px; font-weight: 600;">${subtitle}</div>
    `;
    dynamicStatsContainer.appendChild(card);
}

// PDF İNDİRME İŞLEMİ
btnExportStatsPDF.addEventListener('click', async () => {
    const originalText = btnExportStatsPDF.textContent;
    btnExportStatsPDF.innerHTML = "Hazırlanıyor...";
    btnExportStatsPDF.disabled = true;

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const fontUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
        const res = await fetch(fontUrl);
        const blob = await res.blob();
        
        const base64Font = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
        });

        doc.addFileToVFS("Roboto-Regular.ttf", base64Font);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
        doc.setFont("Roboto");

        const cards = document.querySelectorAll('#dynamicStatsContainer .card');
        const tableData: string[][] = [];
        
        cards.forEach(card => {
            const title = card.querySelector('.card-title')?.textContent || '';
            const value = card.querySelector('.card-value')?.textContent || '';
            const subtitle = card.querySelector('.card-subtitle')?.textContent || '';
            tableData.push([title, value, subtitle]);
        });

        if (tableData.length === 0) {
            alert("İndirilecek veri bulunamadı.");
            return;
        }

        doc.setFontSize(16);
        doc.text("Sistem İstatistikleri Raporu", 14, 15);
        doc.setFontSize(10);
        const selectedText = statsFilter.options[statsFilter.selectedIndex].text;
        doc.text(`Analiz Kapsamı: ${selectedText}`, 14, 22);

        (doc as any).autoTable({
            head: [['Analiz Kriteri', 'Değer', 'Detaylar']],
            body: tableData,
            startY: 28,
            theme: 'grid',
            styles: { font: "Roboto", fontSize: 10, cellPadding: 4 },
            headStyles: { fillColor: [30, 41, 59] },
            columnStyles: {
                0: { cellWidth: 50, fontStyle: 'bold' },
                1: { cellWidth: 35, halign: 'center', textColor: [59, 130, 246], fontStyle: 'bold' },
                2: { cellWidth: 'auto', textColor: [100, 116, 139] }
            }
        });

        const fileName = `Analiz_${statsFilter.value}.pdf`;
        doc.save(fileName);

    } catch (error) {
        console.error("PDF oluşturulurken hata:", error);
        alert("PDF oluşturulurken bir hata oluştu.");
    } finally {
        btnExportStatsPDF.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Rapor
        `;
        btnExportStatsPDF.disabled = false;
    }
});

loadDataAndInit();