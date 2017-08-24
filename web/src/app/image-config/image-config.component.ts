import { Component, OnInit } from '@angular/core';
import { StateService } from '../state.service';
import { ApiService } from '../api.service';
import { ModalService } from '../modal.service';

@Component({
    selector: 'app-image-config',
    templateUrl: './image-config.component.html',
    styleUrls: ['./image-config.component.css']
})
export class ImageConfigComponent implements OnInit {
    configuring: boolean = false;
    image: string;
    share: string;
    shareText: string = "";
    host: string;
    resizes: Array<number>;
    deleteText: string = "Delete";

    constructor(private api: ApiService, private state: StateService, private modals: ModalService) {
        this.state.get("configuring").subscribe(value => {
            this.configuring = value;
            if (this.configuring) {
                this.deleteText = "Delete";
                this.shareText = "";
                this.share = undefined;
            }
        });
        this.state.get("image").subscribe(value => {
            this.image = value;
            this.deleteText = "Delete";
            this.shareText = "";
            this.share = undefined;
        });
        this.api.cached("/resizes").subscribe(data => {
            this.host = data.host;
            this.resizes = data.resizes;
        });
    }

    setShare(ev) {
        if (!this.configuring)
            return;
        this.share = ev;
        if (ev == "Full") {
            this.shareText = `${this.host}/api/v1/image/${this.image}`;
        } else {
            const x = ev.indexOf("x");
            if (x === -1)
                return;
            const w = parseInt(ev.substr(0, x));
            this.shareText = `${this.host}/api/v1/resized/${w}/${this.image}`;
        }
    }

    deleteImage() {
        if (!this.configuring)
            return;
        if (this.deleteText == "Delete") {
            this.deleteText = "Confirm";
        } else {
            this.deleteText = "Delete";
            // delete image
            this.api.get(`/delete/${this.image}`).subscribe(data => {
                console.log("deleted?", data);
                this.modals.close("image");
                this.state.set("refresh", true);
            });
        }
    }

    close() {
        this.state.set("configuring", false);
    }

    ngOnInit() {
    }
}
