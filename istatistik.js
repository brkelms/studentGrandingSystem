// @ts-ignore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
// @ts-ignore
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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
let allStudents = [];
// DOM Elemanları
const statsFilter = document.getElementById('statsFilter');
const dynamicStatsContainer = document.getElementById('dynamicStatsContainer');
const btnExportStatsPDF = document.getElementById('btnExportStatsPDF');
// 1. Veritabanından Verileri Çek
async function loadDataAndInit() {
    try {
        dynamicStatsContainer.innerHTML = '<h3>Veriler hesaplanıyor...</h3>';
        const querySnapshot = await getDocs(collection(db, "ogrenci_notlari"));
        querySnapshot.forEach((doc) => allStudents.push(doc.data()));
        updateStatistics();
    }
    catch (error) {
        console.error("Veriler çekilirken hata:", error);
        dynamicStatsContainer.innerHTML = '<div class="card"><h3 style="color:red;">Veriler yüklenemedi. Bağlantınızı kontrol edin.</h3></div>';
    }
}
statsFilter.addEventListener('change', updateStatistics);
// 2. Seçime Göre Yönlendirme
function updateStatistics() {
    const selected = statsFilter.value;
    dynamicStatsContainer.innerHTML = '';
    if (allStudents.length === 0) {
        dynamicStatsContainer.innerHTML = '<div class="card"><h3>Kayıtlı öğrenci bulunmuyor.</h3></div>';
        return;
    }
    if (selected === '5-all' || selected === '6-all') {
        renderGradeLevelStats(selected);
    }
    else {
        renderClassStats(selected);
    }
}
// 3. KADEME İSTATİSTİKLERİ
function renderGradeLevelStats(gradeLevel) {
    const gradePrefix = gradeLevel.split('-')[0];
    const filteredStudents = allStudents.filter(s => s.sinif && s.sinif.startsWith(gradePrefix));
    if (filteredStudents.length === 0) {
        dynamicStatsContainer.innerHTML = `<div class="card"><h3>Bu kademede henüz kayıt yok.</h3></div>`;
        return;
    }
    const scores = filteredStudents.map(s => s.toplam);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const maxCount = scores.filter(s => s === maxScore).length;
    const minCount = scores.filter(s => s === minScore).length;
    const branchStats = {};
    filteredStudents.forEach(s => {
        if (!branchStats[s.sinif])
            branchStats[s.sinif] = { total: 0, count: 0 };
        branchStats[s.sinif].total += s.toplam;
        branchStats[s.sinif].count++;
    });
    let bestBranch = "-";
    let bestAvg = -1;
    let worstBranch = "-";
    let worstAvg = 101;
    for (const [branch, data] of Object.entries(branchStats)) {
        const avg = data.total / data.count;
        if (avg > bestAvg) {
            bestAvg = avg;
            bestBranch = branch;
        }
        if (avg < worstAvg) {
            worstAvg = avg;
            worstBranch = branch;
        }
    }
    createCard("En Başarılı Sınıf", bestBranch, `(Ortalama: ${bestAvg.toFixed(1)})`);
    createCard("En Başarısız Sınıf", worstBranch, `(Ortalama: ${worstAvg.toFixed(1)})`);
    createCard("En Yüksek Puan", `${maxScore}`, `Bu puanı alan: ${maxCount} Öğrenci`);
    createCard("En Düşük Puan", `${minScore}`, `Bu puanı alan: ${minCount} Öğrenci`);
}
// 4. ŞUBE İSTATİSTİKLERİ
function renderClassStats(className) {
    const filteredStudents = allStudents.filter(s => s.sinif === className);
    if (filteredStudents.length === 0) {
        dynamicStatsContainer.innerHTML = `<div class="card"><h3>Bu şubede henüz kayıt yok.</h3></div>`;
        return;
    }
    const scores = filteredStudents.map(s => s.toplam);
    const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const maxCount = scores.filter(s => s === maxScore).length;
    const minCount = scores.filter(s => s === minScore).length;
    const is6th = className.startsWith('6');
    const questionCount = is6th ? 6 : 5;
    const qStats = { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0, s6: 0 };
    filteredStudents.forEach(s => {
        qStats.s1 += s.s1 || 0;
        qStats.s2 += s.s2 || 0;
        qStats.s3 += s.s3 || 0;
        qStats.s4 += s.s4 || 0;
        qStats.s5 += s.s5 || 0;
        if (is6th)
            qStats.s6 += s.s6 || 0;
    });
    let bestQ = "-";
    let bestQAvg = -1;
    let worstQ = "-";
    let worstQAvg = 101;
    for (let i = 1; i <= questionCount; i++) {
        const avg = qStats[`s${i}`] / filteredStudents.length;
        if (avg > bestQAvg) {
            bestQAvg = avg;
            bestQ = `Soru ${i}`;
        }
        if (avg < worstQAvg) {
            worstQAvg = avg;
            worstQ = `Soru ${i}`;
        }
    }
    createCard("Sınıf Ortalaması", `${avgScore}`, `Toplam ${filteredStudents.length} Öğrenci`);
    createCard("En Yüksek Puan", `${maxScore}`, `Bu puanı alan: ${maxCount} Öğrenci`);
    createCard("En Düşük Puan", `${minScore}`, `Bu puanı alan: ${minCount} Öğrenci`);
    createCard("En Çok Yapılan", `${bestQ}`, `Soru Ortalaması: ${bestQAvg.toFixed(1)} Puan`);
    createCard("En Az Yapılan", `${worstQ}`, `Soru Ortalaması: ${worstQAvg.toFixed(1)} Puan`);
}
// 5. KART OLUŞTURUCU
function createCard(title, value, subtitle) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <h3 class="card-title">${title}</h3>
        <div class="card-value" style="font-size: 1.8rem; color: #3b82f6;">${value}</div>
        <div class="card-subtitle" style="font-size: 0.85rem; color: #64748b; margin-top: 8px; font-weight: 600;">${subtitle}</div>
    `;
    dynamicStatsContainer.appendChild(card);
}
// 6. PDF İNDİRME İŞLEMİ (TÜRKÇE KARAKTER DESTEKLİ)
btnExportStatsPDF.addEventListener('click', async () => {
    const originalText = btnExportStatsPDF.textContent;
    btnExportStatsPDF.textContent = "PDF Hazırlanıyor...";
    btnExportStatsPDF.disabled = true;
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        // Türkçe karakter için Roboto fontunu indir ve ekle
        const fontUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
        const res = await fetch(fontUrl);
        const blob = await res.blob();
        const base64Font = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
        });
        doc.addFileToVFS("Roboto-Regular.ttf", base64Font);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
        doc.setFont("Roboto");
        // Ekrandaki kartları diziye çevir
        const cards = document.querySelectorAll('#dynamicStatsContainer .card');
        const tableData = [];
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
        // Başlıklar
        doc.setFontSize(16);
        doc.text("Sistem İstatistikleri Raporu", 14, 15);
        doc.setFontSize(10);
        const selectedText = statsFilter.options[statsFilter.selectedIndex].text;
        doc.text(`Analiz Kapsamı: ${selectedText}`, 14, 22);
        // Tabloyu Çiz
        doc.autoTable({
            head: [['Analiz Kriteri', 'Değer', 'Detaylar']],
            body: tableData,
            startY: 28,
            theme: 'grid',
            styles: { font: "Roboto", fontSize: 10, cellPadding: 4 },
            headStyles: { fillColor: [30, 41, 59] },
            columnStyles: {
                0: { cellWidth: 50, fontStyle: 'bold' },
                1: { cellWidth: 30, halign: 'center', textColor: [59, 130, 246], fontStyle: 'bold' },
                2: { cellWidth: 'auto', textColor: [100, 116, 139] }
            }
        });
        // Dosyayı İndir
        const fileName = `Analiz_${statsFilter.value}.pdf`;
        doc.save(fileName);
    }
    catch (error) {
        console.error("PDF oluşturulurken hata:", error);
        alert("PDF oluşturulurken bir hata oluştu.");
    }
    finally {
        btnExportStatsPDF.textContent = originalText;
        btnExportStatsPDF.disabled = false;
    }
});
// Uygulamayı Başlat
loadDataAndInit();
