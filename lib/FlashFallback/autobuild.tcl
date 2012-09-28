#!/usr/bin/tclsh

proc sums {} {
    set sums [list]
    foreach file [concat [glob -nocomplain -join *.as] [glob -nocomplain -join * *.as] [glob -nocomplain -join * * *.as]  [glob -nocomplain -join * * * *.as]] {
        if { [string match $file *swf] } {continue}
        lappend sums $file [exec md5 $file]
    }
    return $sums
}

proc build {} {
    catch {
        return [exec ./build.sh 2>@1]
    } err
    return $err
}

puts [build]
puts ""

array set sum [sums]
while {1} {
    after 500

    set changed_files [list]
    foreach {f m} [sums] {
        if { [set sum($f)] != $m } {
            lappend changed_files $f
        }
    }
    if { [llength $changed_files] } {
        array set sum [sums]
        puts "[join $changed_files {, }] changed, building"
        puts [build]
        puts "Done building\n"
    }
}
