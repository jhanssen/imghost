import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';
import { ModalService } from '../modal.service';

@Component({
    selector: 'app-upload',
    templateUrl: './upload.component.html',
    styleUrls: ['./upload.component.css']
})
export class UploadComponent implements OnInit {
    pendingUploads: Array<any> = [];

    constructor(private api: ApiService, private modals: ModalService) { }

    ngOnInit() {
    }

    onSubmit() {
        console.log("submitting", this.pendingUploads);
        // this.pendingUploads
        this.api.upload("/images/upload", "photos", this.pendingUploads).subscribe(data => {
            console.log("uploaded?", data);
            this.pendingUploads = [];

            const preview = document.querySelector(".preview");
            const copy = preview.cloneNode(false);
            preview.parentNode.replaceChild(copy, preview);

            this.modals.close("upload");
        });
    }

    onDrop(transfer: any) {
        console.log("ondrop", transfer);
        const preview = document.querySelector(".preview");
        const files = transfer.files;
        for (let i = 0; i < files.length; ++i) {
            let file = files[i];
            let div = document.createElement('div');
            div.classList.add("preview-item");

            let img = document.createElement('img');
            img.onload = function () {
                window.URL.revokeObjectURL((<HTMLImageElement>this).src);
            };
            img.height = 100;
            img.src = window.URL.createObjectURL(file);
            div.appendChild(img);
            preview.appendChild(div);

            this.pendingUploads.push(file);
        }
    }

    cancel() {
        this.pendingUploads = [];

        const preview = document.querySelector(".preview");
        const copy = preview.cloneNode(false);
        preview.parentNode.replaceChild(copy, preview);

        this.modals.close("upload");
    }
}
