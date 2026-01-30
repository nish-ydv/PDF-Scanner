const {PDFDocument} = PDFLib;
console.log(PDFLib);
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const input = document.getElementById("shrinkpdf");
const preview = document.getElementById("preview");
const shrinkBtn = document.getElementById("shrinkbtn");
const message = document.getElementById("message");
const dropZone = document.getElementById("target");

let selectedfiles = [];
input.addEventListener("change", () =>{
    handlefiles(input.files);
});

shrinkBtn.addEventListener("click", async () => {
    SetLoading(true);
    try{
        await shrinkPDF(selectedfiles[0]);
        showResult();
        reset();
    }
    catch(err){
        showError("Failed To Shrink");
        console.log(err);
    }
    finally{
        SetLoading(false);
    }
})
dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
})

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handlefiles(files);
})

dropZone.addEventListener("dragenter", () => {
    dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
});
dropZone.addEventListener("drop", () => {
    dropZone.classList.remove("drag-over");
});


function handlefiles(files){
    let haserror = false;   
    for (const file of files) {
        if (! validfileType(file)){
            message.textContent = `File name: ${file.name} is not a valid type`;
            haserror = true;
            break;
        }
        if(isduplicate(file)){
            message.textContent = `file name: ${file.name} is already selected`;
            haserror = true;
            break;
        }
        if(fileSize(file)){
            const f_size = (file.size/ 1024/ 1024).toFixed(2);
            message.textContent = `file size: ${f_size}mb is over 10 mb`;
            haserror = true;
            break;
        }
        selectedfiles.push(file);
    }
    if(!haserror){
        printlist();
    }
    updateMessageAndButton(haserror);
    input.value = "";    
};

function printlist(){
    preview.innerHTML = "";
    const list = document.createElement("ul");
    selectedfiles.forEach((file,index) => {
        const item = document.createElement("li");
        const text = document.createTextNode(file.name);
        const f_size = (file.size / 1024 / 1024).toFixed(2);
        text.textContent = file.name + " " + f_size +"mb";

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "❌";
        removeBtn.classList.add("remove-btn");
        removeBtn.addEventListener("click", () => {
            removeFile(index);
        })
        item.appendChild(text);
        item.appendChild(removeBtn);
        list.appendChild(item);
    });
    preview.appendChild(list);
}

function updateMessageAndButton(haserror){

    if(haserror){
        shrinkBtn.disabled = true;
        return;
    }
    message.innerHTML = "";
    if(selectedfiles.length < 1 ){
        shrinkBtn.disabled = true;
        message.textContent = "Select Atleast 1 file";
    }
    else if(selectedfiles.length > 1){
        shrinkBtn.disabled = true;
        message.textContent = "Select Only one PDF"
    }
    else if(!haserror){
        shrinkBtn.disabled = false;
        message.textContent = "";
    }
}

const fileType = ["application/pdf"];
function validfileType(file) {
    return fileType.includes(file.type);
}


function isduplicate(file){
    for(const existingFile of selectedfiles){
        if(existingFile.name === file.name && existingFile.size === file.size){
            return true;
        }    
    }
    return false;
}

function removeFile(index){
    selectedfiles.splice(index,1);
    printlist();
    updateMessageAndButton(false);
};


function fileSize(file){
    const max_file = 10 * 1024 * 1024
    if(file.size > max_file){
        return true;
    }
    return false;
}

function SetLoading(isLoading){
    if(isLoading){
        shrinkBtn.disabled=true;
        shrinkBtn.textContent = "Processing";
    }
    else{
        shrinkBtn.disabled = false;
        shrinkBtn.textContent = "Shrink PDF";
    }
}

async function pdfPageToCompressed(page,scale=1.0,quality=0.75){
    const viewport = page.getViewport({scale});
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
        canvasContext: ctx,
        viewport: viewport,
    }).promise;
    const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, "image/jpeg", quality);
    });
    canvas.width = 0;
    canvas.height = 0;
    return blob;
} 


async function shrinkPDF(file){
    if(!file || file.type !== "application/pdf"){
        throw new Error("Invalid PDF File");
    }
    const pdfBytes = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data:pdfBytes}).promise;

    const shrinkpdf = await PDFLib.PDFDocument.create();

    for(let i =1;i<=pdf.numPages;i++){
        const page = await pdf.getPage(i);

        const imageBlob = await pdfPageToCompressed(page,1,0.75);
        const imageBytes = await imageBlob.arrayBuffer();

        const image = await shrinkpdf.embedJpg(imageBytes);
        const pdfPage = shrinkpdf.addPage([image.width,image.height]);

        pdfPage.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
        });
    }
    const shrinkpdfBytes = await shrinkpdf.save();
    downloadPDF(shrinkpdfBytes);
}

function downloadPDF(bytes){
    const blob = new Blob([bytes], {type : "application/pdf"});
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "shrinked.pdf";
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showResult(){
    const result = document.getElementById("result");
    result.classList.remove("hidden");
    result.textContent = "PDF Shrinked Successfully";

    setTimeout(() => {
        result.classList.add("hidden");
    },3000);
}

function showError(msg){
    const result = document.getElementById("result");
    result.classList.remove("hidden");
    result.textContent = msg;
}

function reset(){
    selectedfiles = [];
    preview.innerHTML="";
    input.value="";
    shrinkBtn.disabled=true;
}