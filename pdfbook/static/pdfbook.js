function imageFromCanvas(canvas, renderTask) {
    var img = document.createElement('img');
    img.width = canvas.width;
    img.height = canvas.height;
    img.className = 'own-size hard page-content';
    renderTask.promise.then(function() {
        canvas.toBlob(blob => {
            let url = URL.createObjectURL(blob);
            img.onload = function() {
                URL.revokeObjectURL(url);
            };
            img.src = url;
        });
    });
    return img;
}
function scaledViewport(page, size) {
    let { width, height } = size;
    var vp = page.getViewport({scale: 1.0});
    var scale = Math.min(height / vp.height, width / vp.width);
    vp = page.getViewport({scale: scale});
    return vp;
}
function renderPage(page, size) {
    let vp = scaledViewport(page, size);
    var canvas = document.createElement('canvas');
    //document.body.appendChild(canvas);
    canvas.className = 'own-size hard page-content';
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    canvas.setAttribute('page', `${page.pageNumber}`);
    var ctx = canvas.getContext('2d');

    var renderContext = {
        canvasContext: ctx,
        viewport: vp
    };
    let renderTask = page.render(renderContext);
    renderTask.promise.then(() => { console.log('rendered page %s', page.pageNumber)});
    return canvas;
}
function renderPageInto(page, $pc) {
    var width = $pc.width(), height = $pc.height();
    let canvas = renderPage(page, {width, size});
    $pc.append(canvas);
}
function renderView(pdf, view) {
    const book = $('#flipbook');
    const size = book.turn('size');
    view.forEach(function(p) {
        if (p == 0) return;
        // after firing "turning" event, turn.js moves page content to another element
        // for page-turning animation. so we may not be able to access page-content
        // element with selector from inside the callback. get hold of the element before
        // calling getPage.
        //const $pc = book.find('div.page-wrapper[page="' + p +'"]');
        //const $page = $pc.find('.page-content');
        //if ($page.length == 0) {
        if (!book.turn('hasPage', p)) {
            //pdf.getPage(p).then(page => renderPage(page, $pc));
            let c = $('<span class="page-content hard">');
            pdf.getPage(p).then(page => {
                console.log('rendering page %s (p=%s)', page.pageNumber, p);
                c.append(renderPage(page, size));
            });
            book.turn('addPage', c, p);
        }
    });
}
function pages(range) {
    let r = [];
    for (p = range[0]; p <= range[1]; p++) {
        r.push(p);
    }
    return r;
}
function updateProgress(progress) {
    if (typeof progress == 'boolean') {
        $('#load-progress .bar').css({width:0});
        $('#load-progress').css({display: progress ? 'block' : 'none'});
    } else {
        let pc = (progress.loaded / progress.total) * 100;
        $('#load-progress .bar').css({width:(`${pc}%`) });
    }
}
function renderbook(target, dir) {
    // workerSrc should be set before calling getDocument()
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.4.456/pdf.worker.js";
    updateProgress(true);
    var loadingTask = pdfjsLib.getDocument({
	url: target,
	cMapUrl: 'static/pdfjs/web/cmaps/',
	cMapPacked: true
    });
    loadingTask.onProgress = updateProgress;
    loadingTask.promise.then(pdf => {
        updateProgress(false);
        // get page size from the first page
        let size = {width:1200, height: 800};
        let centerWidth = $('#center').innerWidth();
        pdf.getPage(1).then(page => {
            let vp = scaledViewport(page, size);
            let pageSize = {width:vp.width, height:vp.height};
            // position #flipbook at the center of #center - we cannot use #flipbook's margin
            // because turn.js manipulates it for "autoCenter" (it doesn't take container's width
            // into account).
            let centerPadding = Math.max(0, centerWidth / 2 - vp.width);
            $('#center').css('padding-left', centerPadding);
            initTurnjs(pdf, pageSize);
        });
    });
}
function initTurnjs(pdf, pageSize) {
    var book = $('#flipbook');

    // create page content elements
    // var pageSideClass = dir == 'ltr' ? ['right', 'left'] : ['left', 'right'];
    // for (var p = 0; p < pdf.numPages; p++) {
    //     var $pc = $('<div>').appendTo(book);
    //     $pc.addClass(pageSideClass[p % 2]);
    //     $pc.addClass('hard')
    // }

    book.turn({
        direction: dir,
        height: pageSize.height,
        width: pageSize.width * 2,
        autoCenter: true,
        turnCorners: 'l,r',
        duration: 1000,
        pages: pdf.numPages,
        page: 1,
        when: {
            turning(event, p, view) {
                // view is a list of pages shown
                console.log('turning page %s view=%o', p, view);
                //renderView(pdf, view);
                renderView(pdf, view); //pages(book.turn('range', view[0])));
            },
            turned(event, p, view) {
                console.log('turned page %s view=%o', p, view);
                // load pages ahead
                renderView(pdf, pages(book.turn('range')));
            },
            // missing event handler is required if all pages are loaded dynamically,
            // and must addPage for the initial page (page 1). Otherwise data.page is
            // left uddefined and all later turn('page') will fail. We don't want to
            // load missing pages in this handler, because it prevents page-flipping
            // animation from working.
            missing(event, missingPages) {
                if (book.turn('page')===undefined) {
                    renderView(pdf, missingPages);
                }
            }
        }
    });
    // book.bind("turning", (event, p, view) => {
    //     // view is a list of pages shown
    //     console.log('turning page %s view=%o', p, view);
    //     //renderView(pdf, view);
    //     renderView(pdf, pages(book.turn('range', view[0])));
    // });
    // book.bind("turned", (event, page, view) => {
    //     console.log('turned page %s view=%o', page, view);
    //     if (page == 1) {
    //         renderView(pdf, view);
    //     }
    // });
    var turnAction = { left: 'previous', right: 'next' };
    $('#left-button').on('click', () => {
        book.turn(turnAction['left']);
    });
    $('#right-button').on('click', () => {
        book.turn(turnAction['right']);
    });
    //book.turn('page', 1);
    //renderView(pdf, pages(book.turn('range', 1)));
    //renderView(pdf, [1]);
}
