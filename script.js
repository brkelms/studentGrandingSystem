// @ts-ignore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
// @ts-ignore
import { getFirestore, collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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
// DOM Elemanları (Form ve Tablo)
const form = document.getElementById('gradeForm');
const studentNameInput = document.getElementById('studentName');
const studentClassSelect = document.getElementById('studentClass');
const examTotalInput = document.getElementById('exam1Total');
const gradesTableBody = document.querySelector('#gradesTable tbody');
const questionsGrid = document.getElementById('questionsGrid');
const submitBtn = form.querySelector('.btn-submit');
// DOM Elemanları (Filtreleme ve Dışa Aktarma)
const searchNameInput = document.getElementById('searchName');
const filterClassSelect = document.getElementById('filterClass');
const btnExportExcel = document.getElementById('btnExportExcel');
const btnExportPDF = document.getElementById('btnExportPDF');
// Düzenleme modu takibi
let currentEditId = null;
// Soru inputlarını diziye alma
const questionInputs = [];
for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`q${i}`);
    if (input)
        questionInputs.push(input);
}
// Toplam Hesaplama
function calculateTotal() {
    let totalScore = 0;
    const is6th = studentClassSelect.value.startsWith('6');
    const maxQuestions = is6th ? 6 : 5;
    for (let i = 0; i < maxQuestions; i++) {
        const value = parseInt(questionInputs[i].value);
        if (!isNaN(value)) {
            totalScore += value;
        }
    }
    examTotalInput.value = totalScore.toString();
}
questionInputs.forEach(input => {
    input.addEventListener('input', calculateTotal);
});
// FORM: Sınıf Değişimi (Sadece formdaki S6 inputunu göster/gizle)
studentClassSelect.addEventListener('change', () => {
    const is6th = studentClassSelect.value.startsWith('6');
    const q6Container = document.getElementById('q6-container');
    if (is6th) {
        q6Container.style.display = 'block';
        questionsGrid.style.gridTemplateColumns = 'repeat(6, 1fr)';
    }
    else {
        q6Container.style.display = 'none';
        questionsGrid.style.gridTemplateColumns = 'repeat(5, 1fr)';
        if (!currentEditId)
            questionInputs[5].value = '';
    }
    calculateTotal();
});
// FORMU GÖNDERME (Kaydet / Güncelle)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.textContent = currentEditId ? "Güncelleniyor..." : "Buluta Kaydediliyor...";
    submitBtn.disabled = true;
    const is6th = studentClassSelect.value.startsWith('6');
    const recordToSave = {
        adSoyad: studentNameInput.value,
        sinif: studentClassSelect.value,
        s1: parseInt(questionInputs[0].value) || 0,
        s2: parseInt(questionInputs[1].value) || 0,
        s3: parseInt(questionInputs[2].value) || 0,
        s4: parseInt(questionInputs[3].value) || 0,
        s5: parseInt(questionInputs[4].value) || 0,
        toplam: parseInt(examTotalInput.value) || 0
    };
    if (is6th) {
        recordToSave.s6 = parseInt(questionInputs[5].value) || 0;
    }
    try {
        if (currentEditId) {
            const docRef = doc(db, "ogrenci_notlari", currentEditId);
            await updateDoc(docRef, recordToSave);
            currentEditId = null;
            submitBtn.textContent = "Sisteme Kaydet";
            submitBtn.style.backgroundColor = "#3b82f6";
        }
        else {
            recordToSave.kayitTarihi = serverTimestamp();
            await addDoc(collection(db, "ogrenci_notlari"), recordToSave);
        }
        form.reset();
        examTotalInput.value = '';
        studentClassSelect.dispatchEvent(new Event('change'));
        await loadGradesFromCloud();
    }
    catch (error) {
        console.error("Firestore Hatası: ", error);
        alert("Bir hata oluştu. Lütfen bağlantınızı kontrol edin.");
        submitBtn.disabled = false;
        submitBtn.textContent = currentEditId ? "Kaydı Güncelle" : "Sisteme Kaydet";
    }
});
// TABLOYA SATIR EKLEME
function addRecordToTable(record) {
    const tr = document.createElement('tr');
    const isFilter5th = filterClassSelect.value.startsWith('5');
    const s6DisplayStyle = isFilter5th ? 'none' : 'table-cell';
    const isRecord6th = record.sinif && record.sinif.startsWith('6');
    const s6Value = (isRecord6th && record.s6 !== undefined) ? record.s6 : '-';
    tr.innerHTML = `
        <td>${record.adSoyad}</td>
        <td>${record.sinif}</td>
        <td class="col-question">${record.s1}</td>
        <td class="col-question">${record.s2}</td>
        <td class="col-question">${record.s3}</td>
        <td class="col-question">${record.s4}</td>
        <td class="col-question">${record.s5}</td>
        <td class="col-question cell-s6" style="display: ${s6DisplayStyle};">${s6Value}</td>
        <td class="col-total"><strong>${record.toplam}</strong></td>
    `;
    const actionTd = document.createElement('td');
    // --- DÜZENLE BUTONU ---
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Düzenle';
    editBtn.className = 'btn-edit';
    editBtn.addEventListener('click', () => {
        currentEditId = record.id;
        studentNameInput.value = record.adSoyad;
        studentClassSelect.value = record.sinif;
        studentClassSelect.dispatchEvent(new Event('change'));
        questionInputs[0].value = record.s1;
        questionInputs[1].value = record.s2;
        questionInputs[2].value = record.s3;
        questionInputs[3].value = record.s4;
        questionInputs[4].value = record.s5;
        if (isRecord6th && record.s6 !== undefined) {
            questionInputs[5].value = record.s6;
        }
        calculateTotal();
        submitBtn.textContent = "Kaydı Güncelle";
        submitBtn.style.backgroundColor = "#f59e0b";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    // --- SİL BUTONU ---
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Sil';
    deleteBtn.className = 'btn-delete';
    deleteBtn.addEventListener('click', async () => {
        const confirmDelete = confirm(`${record.adSoyad} isimli öğrencinin kaydını silmek istediğinize emin misiniz?`);
        if (confirmDelete) {
            try {
                await deleteDoc(doc(db, "ogrenci_notlari", record.id));
                tr.remove();
                if (currentEditId === record.id) {
                    form.reset();
                    examTotalInput.value = '';
                    currentEditId = null;
                    submitBtn.textContent = "Sisteme Kaydet";
                    submitBtn.style.backgroundColor = "#3b82f6";
                    studentClassSelect.dispatchEvent(new Event('change'));
                }
            }
            catch (error) {
                console.error("Silme Hatası: ", error);
                alert("Kayıt silinirken bir hata oluştu.");
            }
        }
    });
    actionTd.appendChild(editBtn);
    actionTd.appendChild(deleteBtn);
    tr.appendChild(actionTd);
    gradesTableBody.appendChild(tr);
}
// FİLTRELEME VE TABLO SÜTUN YÖNETİMİ
function filterTable() {
    const searchTerm = searchNameInput.value.toLowerCase();
    const selectedFilter = filterClassSelect.value;
    const rows = gradesTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const studentName = row.cells[0].textContent?.toLowerCase() || '';
        const studentClass = row.cells[1].textContent || '';
        const matchesName = studentName.includes(searchTerm);
        let matchesClass = false;
        if (selectedFilter === 'all')
            matchesClass = true;
        else if (selectedFilter === '5-all')
            matchesClass = studentClass.startsWith('5');
        else if (selectedFilter === '6-all')
            matchesClass = studentClass.startsWith('6');
        else
            matchesClass = (studentClass === selectedFilter);
        row.style.display = (matchesName && matchesClass) ? '' : 'none';
    });
    const thS6 = document.getElementById('th-s6');
    const s6Cells = document.querySelectorAll('.cell-s6');
    if (selectedFilter.startsWith('5')) {
        thS6.style.display = 'none';
        s6Cells.forEach(cell => cell.style.display = 'none');
    }
    else {
        thS6.style.display = 'table-cell';
        s6Cells.forEach(cell => cell.style.display = 'table-cell');
    }
}
searchNameInput.addEventListener('input', filterTable);
filterClassSelect.addEventListener('change', filterTable);
// VERİLERİ BULUTTAN ÇEKME
async function loadGradesFromCloud() {
    try {
        gradesTableBody.innerHTML = '';
        const q = query(collection(db, "ogrenci_notlari"));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return;
        }
        querySnapshot.forEach((docSnap) => {
            const recordData = docSnap.data();
            recordData.id = docSnap.id;
            addRecordToTable(recordData);
        });
        filterTable();
    }
    catch (error) {
        console.error("Veriler çekilirken hata oluştu: ", error);
    }
}
// --- DIŞA AKTARMA (EXCEL VE PDF) YARDIMCI FONKSİYONU ---
function getVisibleTableDataForExport() {
    const data = [];
    const is6thVisible = document.getElementById('th-s6')?.style.display !== 'none';
    // Başlıkları oluştur (İşlemler sütunu hariç)
    const headers = ["Öğrenci", "Sınıf", "S1", "S2", "S3", "S4", "S5"];
    if (is6thVisible)
        headers.push("S6");
    headers.push("Toplam Puan");
    data.push(headers);
    // Filtrelenmiş satırları oku
    const rows = gradesTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        if (row.style.display !== 'none') {
            // ÇÖZÜM BURADA: Dizinin tipini açıkça belirttik (string[]) 
            // ve null hatalarını önlemek için || '' ekledik.
            const rowData = [];
            rowData.push(row.cells[0].textContent || '');
            rowData.push(row.cells[1].textContent || '');
            rowData.push(row.cells[2].textContent || '');
            rowData.push(row.cells[3].textContent || '');
            rowData.push(row.cells[4].textContent || '');
            rowData.push(row.cells[5].textContent || '');
            rowData.push(row.cells[6].textContent || '');
            if (is6thVisible) {
                rowData.push(row.cells[7].textContent || '');
            }
            rowData.push(row.cells[8].textContent || '');
            data.push(rowData);
        }
    });
    return data;
}
// EXCEL İNDİRME İŞLEMİ
btnExportExcel.addEventListener('click', () => {
    const data = getVisibleTableDataForExport();
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Öğrenci Notları");
    const fileName = `Ogrenci_Notlari_${filterClassSelect.value}.xlsx`;
    XLSX.writeFile(workbook, fileName);
});
// PDF İNDİRME İŞLEMİ (Türkçe Karakter Destekli)
btnExportPDF.addEventListener('click', async () => {
    // Kullanıcıya işlemin başladığını göster
    const originalText = btnExportPDF.textContent;
    btnExportPDF.textContent = "PDF Hazırlanıyor...";
    btnExportPDF.disabled = true;
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        // 1. Türkçe destekli Roboto fontunu CDN üzerinden indir ve Base64'e çevir
        const fontUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
        const res = await fetch(fontUrl);
        const blob = await res.blob();
        const base64Font = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
        });
        // 2. Fontu jsPDF'e özel bir font olarak kaydet ve aktif et
        doc.addFileToVFS("Roboto-Regular.ttf", base64Font);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
        doc.setFont("Roboto");
        // 3. Tablo verilerini hazırla
        const data = getVisibleTableDataForExport();
        const headers = data[0];
        const body = data.slice(1);
        // Başlıkları ekle (Artık Türkçe karakter kullanabiliriz)
        doc.setFontSize(16);
        doc.text("Öğrenci Not Listesi", 14, 15);
        doc.setFontSize(10);
        doc.text(`Filtre: ${filterClassSelect.options[filterClassSelect.selectedIndex].text}`, 14, 22);
        // 4. Tabloyu PDF'e çiz (autoTable eklentisine de yeni fontu kullanmasını söylüyoruz)
        doc.autoTable({
            head: [headers],
            body: body,
            startY: 26,
            theme: 'grid',
            styles: {
                font: "Roboto", // CRITICAL: Tablonun da bu fontu kullanması şart
                fontSize: 9,
                cellPadding: 2
            },
            headStyles: { fillColor: [30, 41, 59] }
        });
        // 5. Dosyayı indir
        const fileName = `Ogrenci_Notlari_${filterClassSelect.value}.pdf`;
        doc.save(fileName);
    }
    catch (error) {
        console.error("PDF oluşturulurken hata:", error);
        alert("PDF oluşturulurken bir hata oluştu. İnternet bağlantınızı kontrol edin.");
    }
    finally {
        // İşlem bitince butonu eski haline getir
        btnExportPDF.textContent = originalText;
        btnExportPDF.disabled = false;
    }
});
// Uygulama Başlangıcı
loadGradesFromCloud();
