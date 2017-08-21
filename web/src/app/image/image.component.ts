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

    constructor(private api: ApiService, private state: StateService, private modals: ModalService) {
        this.state.get("image").subscribe(value => {
            //console.log("image", value);
            this.image = value
            this.deleteText = "Delete";
        });
    }

    ngOnInit() {
    }

    close() {
        this.modals.close("image");
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
