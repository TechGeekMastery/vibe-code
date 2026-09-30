import glob,os
head=open('src/00-head.html').read()
css=''.join(open(f).read() for f in sorted(glob.glob('src/*.css')))
head=head.replace('</style>', css+'\n</style>',1)
js=''.join(open(f).read()+'\n' for f in sorted(glob.glob('src/*.js')))
out=head+"<script>\n(function () {\n'use strict';\n"+js+"})();\n</script>\n"
open('deep-recall.html','w').write(out)
open('main.js','w').write("(function () {\n'use strict';\n"+js+"})();\n")
print(len(out))
