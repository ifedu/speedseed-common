'use strict';
var gitHosts = module.exports = {
    github: {
        // First two are insecure and generally shouldn't be used any more, but
        // they are still supported.
        'protocols': ['git', 'http', 'git+ssh', 'git+https', 'ssh', 'https'],
        'domain': 'github.com',
        'treepath': 'tree',
        'filetemplate': 'https://{auth@}raw.githubusercontent.com/{user}/{project}/{committish}/{path}',
        'bugstemplate': 'https://{domain}/{user}/{project}/issues',
        'gittemplate': 'git://{auth@}{domain}/{user}/{project}.git{#committish}',
        'tarballtemplate': 'https://{domain}/{user}/{project}/archive/{committish}.tar.gz'
    },
    bitbucket: {
        'protocols': ['git+ssh', 'git+https', 'ssh', 'https'],
        'domain': 'bitbucket.org',
        'treepath': 'src',
        'tarballtemplate': 'https://{domain}/{user}/{project}/get/{committish}.tar.gz'
    },
    gitlab: {
        'protocols': ['git+ssh', 'git+https', 'ssh', 'https'],
        'domain': 'gitlab.com',
        'treepath': 'tree',
        'docstemplate': 'https://{domain}/{user}/{project}{/tree/committish}#README',
        'bugstemplate': 'https://{domain}/{user}/{project}/issues',
        'tarballtemplate': 'https://{domain}/{user}/{project}/repository/archive.tar.gz?ref={committish}'
    },
    gist: {
        'protocols': ['git', 'git+ssh', 'git+https', 'ssh', 'https'],
        'domain': 'gist.github.com',
        'pathmatch': /^[/](?:([^/]+)[/])?([a-z0-9]+)(?:[.]git)?$/,
        'filetemplate': 'https://gist.githubusercontent.com/{user}/{project}/raw{/committish}/{path}',
        'bugstemplate': 'https://{domain}/{project}',
        'gittemplate': 'git://{domain}/{project}.git{#committish}',
        'sshtemplate': 'git@{domain}:/{project}.git{#committish}',
        'sshurltemplate': 'git+ssh://git@{domain}/{project}.git{#committish}',
        'browsetemplate': 'https://{domain}/{project}{/committish}',
        'docstemplate': 'https://{domain}/{project}{/committish}',
        'httpstemplate': 'git+https://{domain}/{project}.git{#committish}',
        'shortcuttemplate': '{type}:{project}{#committish}',
        'pathtemplate': '{project}{#committish}',
        'tarballtemplate': 'https://{domain}/{user}/{project}/archive/{committish}.tar.gz'
    }
};
var gitHostDefaults = {
    'sshtemplate': 'git@{domain}:{user}/{project}.git{#committish}',
    'sshurltemplate': 'git+ssh://git@{domain}/{user}/{project}.git{#committish}',
    'browsetemplate': 'https://{domain}/{user}/{project}{/tree/committish}',
    'docstemplate': 'https://{domain}/{user}/{project}{/tree/committish}#readme',
    'httpstemplate': 'git+https://{auth@}{domain}/{user}/{project}.git{#committish}',
    'filetemplate': 'https://{domain}/{user}/{project}/raw/{committish}/{path}',
    'shortcuttemplate': '{type}:{user}/{project}{#committish}',
    'pathtemplate': '{user}/{project}{#committish}',
    'pathmatch': /^[/]([^/]+)[/]([^/]+?)(?:[.]git|[/])?$/
};
Object.keys(gitHosts).forEach(function (name) {
    Object.keys(gitHostDefaults).forEach(function (key) {
        if (gitHosts[name][key])
            return;
        gitHosts[name][key] = gitHostDefaults[key];
    });
    gitHosts[name].protocols_re = RegExp('^(' +
        gitHosts[name].protocols.map(function (protocol) {
            return protocol.replace(/([\\+*{}()[\]$^|])/g, '\\$1');
        }).join('|') + '):$');
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxob3N0ZWQtZ2l0LWluZm9cXGdpdC1ob3N0LWluZm8uanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xcaG9zdGVkLWdpdC1pbmZvXFxnaXQtaG9zdC1pbmZvLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQTtBQUVaLElBQUksUUFBUSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEdBQUc7SUFDOUIsTUFBTSxFQUFFO1FBQ04sdUVBQXVFO1FBQ3ZFLDRCQUE0QjtRQUM1QixXQUFXLEVBQUUsQ0FBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBRTtRQUN0RSxRQUFRLEVBQUUsWUFBWTtRQUN0QixVQUFVLEVBQUUsTUFBTTtRQUNsQixjQUFjLEVBQUUsK0VBQStFO1FBQy9GLGNBQWMsRUFBRSwwQ0FBMEM7UUFDMUQsYUFBYSxFQUFFLHlEQUF5RDtRQUN4RSxpQkFBaUIsRUFBRSwrREFBK0Q7S0FDbkY7SUFDRCxTQUFTLEVBQUU7UUFDVCxXQUFXLEVBQUUsQ0FBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUU7UUFDdkQsUUFBUSxFQUFFLGVBQWU7UUFDekIsVUFBVSxFQUFFLEtBQUs7UUFDakIsaUJBQWlCLEVBQUUsMkRBQTJEO0tBQy9FO0lBQ0QsTUFBTSxFQUFFO1FBQ04sV0FBVyxFQUFFLENBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFFO1FBQ3ZELFFBQVEsRUFBRSxZQUFZO1FBQ3RCLFVBQVUsRUFBRSxNQUFNO1FBQ2xCLGNBQWMsRUFBRSw0REFBNEQ7UUFDNUUsY0FBYyxFQUFFLDBDQUEwQztRQUMxRCxpQkFBaUIsRUFBRSw4RUFBOEU7S0FDbEc7SUFDRCxJQUFJLEVBQUU7UUFDSixXQUFXLEVBQUUsQ0FBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFFO1FBQzlELFFBQVEsRUFBRSxpQkFBaUI7UUFDM0IsV0FBVyxFQUFFLDRDQUE0QztRQUN6RCxjQUFjLEVBQUUsNkVBQTZFO1FBQzdGLGNBQWMsRUFBRSw0QkFBNEI7UUFDNUMsYUFBYSxFQUFFLDJDQUEyQztRQUMxRCxhQUFhLEVBQUUsMENBQTBDO1FBQ3pELGdCQUFnQixFQUFFLG1EQUFtRDtRQUNyRSxnQkFBZ0IsRUFBRSx5Q0FBeUM7UUFDM0QsY0FBYyxFQUFFLHlDQUF5QztRQUN6RCxlQUFlLEVBQUUsaURBQWlEO1FBQ2xFLGtCQUFrQixFQUFFLCtCQUErQjtRQUNuRCxjQUFjLEVBQUUsd0JBQXdCO1FBQ3hDLGlCQUFpQixFQUFFLCtEQUErRDtLQUNuRjtDQUNGLENBQUE7QUFFRCxJQUFJLGVBQWUsR0FBRztJQUNwQixhQUFhLEVBQUUsZ0RBQWdEO0lBQy9ELGdCQUFnQixFQUFFLDBEQUEwRDtJQUM1RSxnQkFBZ0IsRUFBRSxxREFBcUQ7SUFDdkUsY0FBYyxFQUFFLDREQUE0RDtJQUM1RSxlQUFlLEVBQUUsK0RBQStEO0lBQ2hGLGNBQWMsRUFBRSwyREFBMkQ7SUFDM0Usa0JBQWtCLEVBQUUsc0NBQXNDO0lBQzFELGNBQWMsRUFBRSwrQkFBK0I7SUFDL0MsV0FBVyxFQUFFLHdDQUF3QztDQUN0RCxDQUFBO0FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxJQUFJO0lBQzFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsR0FBRztRQUNoRCxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUE7UUFDL0IsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUM1QyxDQUFDLENBQUMsQ0FBQTtJQUNGLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLEdBQUcsTUFBTSxDQUFDLElBQUk7UUFDdkMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxRQUFRO1lBQzdDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3hELENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQTtBQUN6QixDQUFDLENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0J1xuXG52YXIgZ2l0SG9zdHMgPSBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgZ2l0aHViOiB7XG4gICAgLy8gRmlyc3QgdHdvIGFyZSBpbnNlY3VyZSBhbmQgZ2VuZXJhbGx5IHNob3VsZG4ndCBiZSB1c2VkIGFueSBtb3JlLCBidXRcbiAgICAvLyB0aGV5IGFyZSBzdGlsbCBzdXBwb3J0ZWQuXG4gICAgJ3Byb3RvY29scyc6IFsgJ2dpdCcsICdodHRwJywgJ2dpdCtzc2gnLCAnZ2l0K2h0dHBzJywgJ3NzaCcsICdodHRwcycgXSxcbiAgICAnZG9tYWluJzogJ2dpdGh1Yi5jb20nLFxuICAgICd0cmVlcGF0aCc6ICd0cmVlJyxcbiAgICAnZmlsZXRlbXBsYXRlJzogJ2h0dHBzOi8ve2F1dGhAfXJhdy5naXRodWJ1c2VyY29udGVudC5jb20ve3VzZXJ9L3twcm9qZWN0fS97Y29tbWl0dGlzaH0ve3BhdGh9JyxcbiAgICAnYnVnc3RlbXBsYXRlJzogJ2h0dHBzOi8ve2RvbWFpbn0ve3VzZXJ9L3twcm9qZWN0fS9pc3N1ZXMnLFxuICAgICdnaXR0ZW1wbGF0ZSc6ICdnaXQ6Ly97YXV0aEB9e2RvbWFpbn0ve3VzZXJ9L3twcm9qZWN0fS5naXR7I2NvbW1pdHRpc2h9JyxcbiAgICAndGFyYmFsbHRlbXBsYXRlJzogJ2h0dHBzOi8ve2RvbWFpbn0ve3VzZXJ9L3twcm9qZWN0fS9hcmNoaXZlL3tjb21taXR0aXNofS50YXIuZ3onXG4gIH0sXG4gIGJpdGJ1Y2tldDoge1xuICAgICdwcm90b2NvbHMnOiBbICdnaXQrc3NoJywgJ2dpdCtodHRwcycsICdzc2gnLCAnaHR0cHMnIF0sXG4gICAgJ2RvbWFpbic6ICdiaXRidWNrZXQub3JnJyxcbiAgICAndHJlZXBhdGgnOiAnc3JjJyxcbiAgICAndGFyYmFsbHRlbXBsYXRlJzogJ2h0dHBzOi8ve2RvbWFpbn0ve3VzZXJ9L3twcm9qZWN0fS9nZXQve2NvbW1pdHRpc2h9LnRhci5neidcbiAgfSxcbiAgZ2l0bGFiOiB7XG4gICAgJ3Byb3RvY29scyc6IFsgJ2dpdCtzc2gnLCAnZ2l0K2h0dHBzJywgJ3NzaCcsICdodHRwcycgXSxcbiAgICAnZG9tYWluJzogJ2dpdGxhYi5jb20nLFxuICAgICd0cmVlcGF0aCc6ICd0cmVlJyxcbiAgICAnZG9jc3RlbXBsYXRlJzogJ2h0dHBzOi8ve2RvbWFpbn0ve3VzZXJ9L3twcm9qZWN0fXsvdHJlZS9jb21taXR0aXNofSNSRUFETUUnLFxuICAgICdidWdzdGVtcGxhdGUnOiAnaHR0cHM6Ly97ZG9tYWlufS97dXNlcn0ve3Byb2plY3R9L2lzc3VlcycsXG4gICAgJ3RhcmJhbGx0ZW1wbGF0ZSc6ICdodHRwczovL3tkb21haW59L3t1c2VyfS97cHJvamVjdH0vcmVwb3NpdG9yeS9hcmNoaXZlLnRhci5nej9yZWY9e2NvbW1pdHRpc2h9J1xuICB9LFxuICBnaXN0OiB7XG4gICAgJ3Byb3RvY29scyc6IFsgJ2dpdCcsICdnaXQrc3NoJywgJ2dpdCtodHRwcycsICdzc2gnLCAnaHR0cHMnIF0sXG4gICAgJ2RvbWFpbic6ICdnaXN0LmdpdGh1Yi5jb20nLFxuICAgICdwYXRobWF0Y2gnOiAvXlsvXSg/OihbXi9dKylbL10pPyhbYS16MC05XSspKD86Wy5dZ2l0KT8kLyxcbiAgICAnZmlsZXRlbXBsYXRlJzogJ2h0dHBzOi8vZ2lzdC5naXRodWJ1c2VyY29udGVudC5jb20ve3VzZXJ9L3twcm9qZWN0fS9yYXd7L2NvbW1pdHRpc2h9L3twYXRofScsXG4gICAgJ2J1Z3N0ZW1wbGF0ZSc6ICdodHRwczovL3tkb21haW59L3twcm9qZWN0fScsXG4gICAgJ2dpdHRlbXBsYXRlJzogJ2dpdDovL3tkb21haW59L3twcm9qZWN0fS5naXR7I2NvbW1pdHRpc2h9JyxcbiAgICAnc3NodGVtcGxhdGUnOiAnZ2l0QHtkb21haW59Oi97cHJvamVjdH0uZ2l0eyNjb21taXR0aXNofScsXG4gICAgJ3NzaHVybHRlbXBsYXRlJzogJ2dpdCtzc2g6Ly9naXRAe2RvbWFpbn0ve3Byb2plY3R9LmdpdHsjY29tbWl0dGlzaH0nLFxuICAgICdicm93c2V0ZW1wbGF0ZSc6ICdodHRwczovL3tkb21haW59L3twcm9qZWN0fXsvY29tbWl0dGlzaH0nLFxuICAgICdkb2NzdGVtcGxhdGUnOiAnaHR0cHM6Ly97ZG9tYWlufS97cHJvamVjdH17L2NvbW1pdHRpc2h9JyxcbiAgICAnaHR0cHN0ZW1wbGF0ZSc6ICdnaXQraHR0cHM6Ly97ZG9tYWlufS97cHJvamVjdH0uZ2l0eyNjb21taXR0aXNofScsXG4gICAgJ3Nob3J0Y3V0dGVtcGxhdGUnOiAne3R5cGV9Ontwcm9qZWN0fXsjY29tbWl0dGlzaH0nLFxuICAgICdwYXRodGVtcGxhdGUnOiAne3Byb2plY3R9eyNjb21taXR0aXNofScsXG4gICAgJ3RhcmJhbGx0ZW1wbGF0ZSc6ICdodHRwczovL3tkb21haW59L3t1c2VyfS97cHJvamVjdH0vYXJjaGl2ZS97Y29tbWl0dGlzaH0udGFyLmd6J1xuICB9XG59XG5cbnZhciBnaXRIb3N0RGVmYXVsdHMgPSB7XG4gICdzc2h0ZW1wbGF0ZSc6ICdnaXRAe2RvbWFpbn06e3VzZXJ9L3twcm9qZWN0fS5naXR7I2NvbW1pdHRpc2h9JyxcbiAgJ3NzaHVybHRlbXBsYXRlJzogJ2dpdCtzc2g6Ly9naXRAe2RvbWFpbn0ve3VzZXJ9L3twcm9qZWN0fS5naXR7I2NvbW1pdHRpc2h9JyxcbiAgJ2Jyb3dzZXRlbXBsYXRlJzogJ2h0dHBzOi8ve2RvbWFpbn0ve3VzZXJ9L3twcm9qZWN0fXsvdHJlZS9jb21taXR0aXNofScsXG4gICdkb2NzdGVtcGxhdGUnOiAnaHR0cHM6Ly97ZG9tYWlufS97dXNlcn0ve3Byb2plY3R9ey90cmVlL2NvbW1pdHRpc2h9I3JlYWRtZScsXG4gICdodHRwc3RlbXBsYXRlJzogJ2dpdCtodHRwczovL3thdXRoQH17ZG9tYWlufS97dXNlcn0ve3Byb2plY3R9LmdpdHsjY29tbWl0dGlzaH0nLFxuICAnZmlsZXRlbXBsYXRlJzogJ2h0dHBzOi8ve2RvbWFpbn0ve3VzZXJ9L3twcm9qZWN0fS9yYXcve2NvbW1pdHRpc2h9L3twYXRofScsXG4gICdzaG9ydGN1dHRlbXBsYXRlJzogJ3t0eXBlfTp7dXNlcn0ve3Byb2plY3R9eyNjb21taXR0aXNofScsXG4gICdwYXRodGVtcGxhdGUnOiAne3VzZXJ9L3twcm9qZWN0fXsjY29tbWl0dGlzaH0nLFxuICAncGF0aG1hdGNoJzogL15bL10oW14vXSspWy9dKFteL10rPykoPzpbLl1naXR8Wy9dKT8kL1xufVxuXG5PYmplY3Qua2V5cyhnaXRIb3N0cykuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuICBPYmplY3Qua2V5cyhnaXRIb3N0RGVmYXVsdHMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgIGlmIChnaXRIb3N0c1tuYW1lXVtrZXldKSByZXR1cm5cbiAgICBnaXRIb3N0c1tuYW1lXVtrZXldID0gZ2l0SG9zdERlZmF1bHRzW2tleV1cbiAgfSlcbiAgZ2l0SG9zdHNbbmFtZV0ucHJvdG9jb2xzX3JlID0gUmVnRXhwKCdeKCcgK1xuICAgIGdpdEhvc3RzW25hbWVdLnByb3RvY29scy5tYXAoZnVuY3Rpb24gKHByb3RvY29sKSB7XG4gICAgICByZXR1cm4gcHJvdG9jb2wucmVwbGFjZSgvKFtcXFxcKyp7fSgpW1xcXSRefF0pL2csICdcXFxcJDEnKVxuICAgIH0pLmpvaW4oJ3wnKSArICcpOiQnKVxufSlcbiJdfQ==