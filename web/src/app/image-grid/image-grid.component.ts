import { Component, OnInit, Input } from '@angular/core';
import { StateService } from '../state.service';
import { ModalService } from '../modal.service';

@Component({
  selector: 'app-image-grid',
  templateUrl: './image-grid.component.html',
  styleUrls: ['./image-grid.component.css']
})
export class ImageGridComponent implements OnInit {
    @Input('images') images: Array<string>;

    constructor(private state: StateService, private modals: ModalService) {
    }

    ngOnInit() {
    }

    showImage(image: string) {
        //console.log("showing", image);
        this.state.set("image", image);
        this.modals.open("image");
        return false;
    }
}
