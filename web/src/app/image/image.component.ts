import { Component, OnInit } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { StateService } from '../state.service';
import { ApiService } from '../api.service';
import { ModalService } from '../modal.service';

@Component({
    selector: 'app-image',
    templateUrl: './image.component.html',
    styleUrls: ['./image.component.css'],
    animations: [
        trigger('slideInOut', [
            state('in', style({
                transform: 'translate3d(0, 0, 0)',
                opacity: '1'
            })),
            state('out', style({
                transform: 'translate3d(100%, 0, 0)',
                opacity: '0'
            })),
            transition('in => out', animate('400ms ease-in-out')),
            transition('out => in', animate('400ms ease-in-out'))
        ]),
    ]
})
export class ImageComponent implements OnInit {
    image: string;
    deleteText: string = "Delete";
    resizes: Array<number>;
    host: string;
    share: string;
    shareText: string = "";
    configState: string = "out";

    constructor(private api: ApiService, private state: StateService, private modals: ModalService) {
        this.state.get("image").subscribe(value => {
            //console.log("image", value);
            this.image = value
            this.deleteText = "Delete";
            this.shareText = "";
            this.share = undefined;
        });
        this.state.get("modal").subscribe(value => {
            if (value === undefined) {
                // we're closed
                this.configState = "out";
            }
        });
        this.state.get("configuring").subscribe(value => {
            if (value == false && this.configState == "in")
                this.configState = "out";
        });

        this.api.get("/resizes").subscribe(data => {
            this.host = data.host;
            this.resizes = data.resizes;
        });
    }

    ngOnInit() {
        (<HTMLElement>document.querySelector("#image .center-modal")).style.overflow = "hidden";
    }

    close() {
        this.modals.close("image");
    }

    settings() {
        this.configState = (this.configState === "out") ? "in" : "out";
    }

    animationDone(event) {
        //console.log("done?", event);
        this.state.set("configuring", (event.toState === "in"));
    }

    setShare(ev) {
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
