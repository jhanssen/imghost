import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';
import { StateService } from '../state.service';

@Component({
    selector: 'app-upload',
    templateUrl: './upload.component.html',
    styleUrls: ['./upload.component.css']
})
export class UploadComponent implements OnInit {
    pendingUploads: Array<any> = [];

    constructor(private api: ApiService, private state: StateService) { }

    ngOnInit() {
    }

    onSubmit() {
        console.log("submitting", this.pendingUploads);
        // this.pendingUploads
        this.api.upload("/images/upload", "photos", this.pendingUploads).subscribe(data => {
            console.log("uploaded?", data);
            this.state.set("uploading", false);
        });
    }

    onDrop(transfer: any) {
        console.log("ondrop", transfer);
        const preview = document.querySelector(".preview");
        const files = transfer.files;
        for (let i = 0; i < files.length; ++i) {
            let file = files[i];
            let img = document.createElement('img');
            img.onload = function () {
                window.URL.revokeObjectURL((<HTMLImageElement>this).src);
            };
            img.height = 100;
            img.src = window.URL.createObjectURL(file);
            preview.appendChild(img);

            this.pendingUploads.push(file);
        }
    }
}
