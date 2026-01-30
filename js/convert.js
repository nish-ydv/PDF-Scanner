const {PDFDocument} = PDFLib;
console.log(PDFLib);

const input = document.getElementById("convertpdf");
const preview = document.getElementById("preview");
const convertBtn = document.getElementById("convertbtn");
const message = document.getElementById("message");
const dropZone = document.getElementById("target");

let selectedfiles = [];
input.addEventListener("change", () =>{
    handlefiles(input.files);
});

convertBtn.addEventListener("click", async () =>{
    SetLoading(true);
    try{
        await convertToPDF(selectedfiles);
        showResult();
        reset();
    }
    catch(err){
        showError("Failed To Convert");
        console.log(err);
    }
    finally{
        SetLoading(false);
    }
});

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
        message.textContent = "";
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
        convertBtn.disabled = true;
        return;
    }

    message.innerHTML = "";
    if(selectedfiles.length < 1){
        convertBtn.disabled = true;
        message.textContent = "Select Atleast 1 file";
    }
    else if(!haserror){
        convertBtn.disabled = false;
        message.textContent = "";
    }
}

const fileType = ["image/jpeg", "image/png"];
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
        convertBtn.disabled=true;
        convertBtn.textContent = "Processing";
    }
    else{
        convertBtn.disabled = false;
        convertBtn.textContent = "Convert To PDF";
    }
}

async function convertToPDF(files){
    if (!files || files.length === 0) {
        throw new Error("No files selected");
    }
    const convertpdf = await PDFDocument.create();
    for(const file of files){
        const arraybuffer = await file.arrayBuffer();
        let image;
        if(file.type === "image/png"){
            image = await convertpdf.embedPng(arraybuffer);
        }
        else if(file.type === "image/jpeg"){
            image = await convertpdf.embedJpg(arraybuffer);
        }
        const page = await convertpdf.addPage([image.width,image.height]);
        page.drawImage(image, {
            x:0,
            y:0,
            width:image.width,
            height:image.height,
        });
    }
    const convertpdfBytes = await convertpdf.save();
    downloadPDF(convertpdfBytes);

}
function downloadPDF(bytes){
    const blob = new Blob([bytes], {type : "application/pdf"});
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.pdf";
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showResult(){
    const result = document.getElementById("result");
    result.classList.remove("hidden");
    result.textContent = "PDF Made Successfully";

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
    convertBtn.disabled=true;
}