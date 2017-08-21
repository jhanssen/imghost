import { Component, OnInit } from '@angular/core';
import { StateService } from '../state.service';
import { ApiService } from '../api.service';
import { ModalService } from '../modal.service';

@Component({
  selector: 'app-image',
  templateUrl: './image.component.html',
  styleUrls: ['./image.component.css']
})
export class ImageComponent implements OnInit {
    image: string;
    deleteText: string = "Delete";
    resizes: Array<number>;
    host: string;
    share: string = "";

    constructor(private api: ApiService, private state: StateService, private modals: ModalService) {
        this.state.get("image").subscribe(value => {
            //console.log("image", value);
            this.image = value
            this.deleteText = "Delete";
            this.share = "";
        });
        this.api.get("/resizes").subscribe(data => {
            this.host = data.host;
            this.resizes = data.resizes;
        });
    }

    ngOnInit() {
    }

    close() {
        this.modals.close("image");
    }

    setShare(ev) {
        if (ev == "Full") {
            this.share = `${this.host}/api/v1/image/${this.image}`;
        } else {
            const x = ev.indexOf("x");
            if (x === -1)
                return;
            const w = parseInt(ev.substr(0, x));
            this.share = `${this.host}/api/v1/resized/${w}/${this.image}`;
        }
    }

    deleteImage() {
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
}
